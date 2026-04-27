#!/bin/bash
set -e

include_test=false
while [ $# -ne 0 ]; do
  arg="$1"
  case "$arg" in
    -t | --test ) include_test=true; break ;;
  esac
  shift
done

for file in $(find config -type f -name "*.example"); do
  new_name=$(echo "$file" | sed -E -e 's/.example//')
  echo "$file -> $new_name"
  cp "$file" "$new_name"

  if [ "$include_test" = true ]; then
    dir_name=$(dirname $new_name)
    base_name=$(basename $new_name)
    test_name="$dir_name/test.$base_name"
    echo "$file -> $test_name"
    cp "$file" "$test_name"
  fi
done
