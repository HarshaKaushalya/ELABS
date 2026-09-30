.PHONY: init up down logs lint test build

init:
	bash scripts/init-dev.sh

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

lint:
	bash scripts/ci/lint.sh

test:
	bash scripts/ci/test.sh

build:
	bash scripts/ci/build.sh