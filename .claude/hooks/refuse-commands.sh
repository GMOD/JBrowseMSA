#!/usr/bin/env bash
# Sends whole-suite test runs and the typecheck to ada where `msa-test` is
# installed. Several agents share the laptop, and one full vitest run here
# competes with every one of them; on ada the same run takes ~40s, install and
# library build included. Only where `msa-test` exists, since this hook is in
# the repo and the runner is one machine's.
#
# Passes: named test files, snapshot updates (whose writes must land here), the
# figures config, anything sent over ssh, and MSA_LOCAL_TESTS=1, the way
# through when ada is unreachable.
input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")
start='(^|[;&|(]|&&|\|\|)[[:space:]]*'
wrapper='((timeout[[:space:]]+[^[:space:]]+|time|nice|nohup|command|env|[A-Za-z_]+=[^[:space:]]*)[[:space:]]+)*'

refuse() {
  echo "$1" >&2
  exit 2
}

command -v msa-test >/dev/null || exit 0
grep -Eq '\bssh\b|MSA_LOCAL_TESTS=1' <<<"$cmd" && exit 0

# only a run inside a react-msaview checkout goes to ada: the directory the
# command's last `cd` names, else the session's
dir=$(grep -oE "(^|[;&|(])[[:space:]]*cd[[:space:]]+[^;&|)[:space:]]+" <<<"$cmd" | tail -1 | sed -E 's/.*cd[[:space:]]+//')
case $dir in '') dir=$cwd ;; '~'*) dir=$HOME${dir:1} ;; /*) ;; *) dir=$cwd/$dir ;; esac
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)
[ -f "$root/packages/lib/src/model.ts" ] && [ -f "$root/vitest.config.ts" ] || exit 0

if grep -Eq "${start}${wrapper}pnpm[[:space:]]+(run[[:space:]]+)?typecheck([[:space:]]|$)" <<<"$cmd"; then
  refuse 'Refused: pnpm typecheck on the laptop. `msa-test --types` runs it on ada (`msa-test --full` runs every suite and then the typecheck). MSA_LOCAL_TESTS=1 when ada is unreachable.'
fi

vitest_call="${start}${wrapper}((pnpm[[:space:]]+(run[[:space:]]+)?test)|((npx|pnpm|pnpm exec)[[:space:]]+vitest)|([^[:space:]]*node_modules/\.bin/vitest))([[:space:]]|$)"
if grep -Eq "$vitest_call" <<<"$cmd" &&
  ! grep -Eq '(^|[[:space:]])(-u|--update|--config[= ][^[:space:]]*figures[^[:space:]]*)\b' <<<"$cmd"; then
  invocation=$(grep -oE "${vitest_call}[^;&|]*" <<<"$cmd" | head -1)
  named=0
  multi=
  while IFS= read -r w; do
    case $w in /*) p=$w ;; *) p=$dir/$w ;; esac
    [ -n "$w" ] && [ -e "$p" ] || continue
    named=$((named + 1))
    if [ -d "$p" ] || ! grep -qE '\.test\.[cm]?[jt]sx?$' <<<"$w"; then
      multi=yes
    fi
  done < <(sed -E 's/.*(test|vitest)([[:space:]]|$)//' <<<"$invocation" | tr -d "\"'" | tr -s '[:space:]' '\n')
  [ "$named" -eq 0 ] && multi=yes
  if [ -n "$multi" ]; then
    refuse 'Refused: a multi-suite vitest run on the laptop. `msa-test` runs the suites this branch changed on ada (`msa-test -- <vitest flags or files>`, `msa-test --all`, `msa-test --full` for every suite plus the typecheck). Name test files to run them here; MSA_LOCAL_TESTS=1 when ada is unreachable.'
  fi
fi
exit 0
