#!/usr/bin/env bash
# Сборка образа под сервер (linux/amd64) и выкладка сайта в /opt/serafim:
#   deploy/server/deploy.sh [root@195.242.118.29]
# Образ собирается здесь, а не на сервере: сборка съела бы до 1 ГБ памяти рядом с ботом Татьяны.
# Каждая выкладка — образ с тегом коммита; откат: на сервере
#   docker tag serafim-site:<прошлый коммит> serafim-site:latest && cd /opt/serafim && docker compose up -d site
set -euo pipefail
host="${1:-root@195.242.118.29}"
key="${SSH_KEY:-$HOME/.ssh/listing_bot}"
app=/opt/serafim
ssh_() { ssh -i "$key" -o BatchMode=yes "$host" "$@"; }
cd "$(dirname "$0")/../.."

tag="$(git rev-parse --short HEAD)"
echo "== Образ serafim-site:$tag"
docker buildx build --platform linux/amd64 --build-arg VITE_SITE_URL=https://serafim6s.ru \
  -t "serafim-site:$tag" -t serafim-site:latest --load .

echo "== На сервер"
ssh_ "mkdir -p $app && chmod 700 $app"
docker save "serafim-site:$tag" | gzip | ssh_ "gunzip | docker load && docker tag serafim-site:$tag serafim-site:latest"
scp -q -i "$key" deploy/server/compose.yaml "$host:$app/compose.yaml"
ssh_ "test -f $app/.env" || { echo "Нет $app/.env на сервере — сначала секреты (DEPLOY.md, раздел «Свой сервер»)." >&2; exit 2; }

echo "== Запуск"
ssh_ "cd $app && docker compose up -d site"
for _ in $(seq 1 30); do
  state="$(ssh_ "docker inspect -f '{{.State.Health.Status}}' serafim-site-1" 2>/dev/null || true)"
  [ "$state" = healthy ] && { echo "Готово: serafim-site:$tag"; exit 0; }
  sleep 3
done
echo "Сайт не поднялся: ssh -i $key $host 'cd $app && docker compose logs --tail 80 site'" >&2
exit 1
