.PHONY: serve build clean

serve: build
	./server -bind 0.0.0.0 -port 8080

build:
	go build -o server server.go

clean:
	rm -f server
