.PHONY: clean build link start dev

lint:
	npm run lint

build:
	npm run build

link:
	npm link

start:
	cd ~/.n8n/custom && npm link n8n-nodes-shippo && n8n start

tests:
	npm run test

dev:
	make clean
	# make lint
	make tests
	make build
	make link
	make start

clean:
	rm -rf ./dist
