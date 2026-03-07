from server import mcp 

def main():
    # Initialize and run the server
    mcp.run(
        transport="http",
        host="0.0.0.0",
        port=8001
    )


if __name__ == "__main__":
    main()