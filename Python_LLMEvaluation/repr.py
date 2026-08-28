class Tool:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f"Tool(name='{self.name}')"

    tools = [Tool("web_search"), Tool("calculator")]
    print(tools)