package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

var markdownFile string

func main() {
	port := flag.String("port", "8080", "port to listen on")
	bind := flag.String("bind", "0.0.0.0", "address to bind to")
	flag.StringVar(&markdownFile, "file", "travel_guide_2026.md", "markdown file to serve/update")
	flag.Parse()

	http.HandleFunc("/api/markdown", handleMarkdown)
	http.Handle("/", http.FileServer(http.Dir(".")))

	addr := fmt.Sprintf("%s:%s", *bind, *port)
	log.Printf("Server starting on %s (editing: %s)", addr, markdownFile)
	log.Fatal(http.ListenAndServe(addr, nil))
}

func handleMarkdown(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getMarkdown(w, r)
	case http.MethodPost:
		postMarkdown(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getMarkdown(w http.ResponseWriter, r *http.Request) {
	content, err := os.ReadFile(markdownFile)
	if err != nil {
		http.Error(w, "Failed to read markdown file", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write(content)
}

func postMarkdown(w http.ResponseWriter, r *http.Request) {
	content, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	cleanPath := filepath.Clean(markdownFile)
	if err := os.WriteFile(cleanPath, content, 0644); err != nil {
		http.Error(w, "Failed to write markdown file", http.StatusInternalServerError)
		return
	}

	log.Printf("Updated %s (%d bytes)", cleanPath, len(content))
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
