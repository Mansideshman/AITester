class Tool:
    def __init__(self, name, enabled=True):
        self.name = name
        self.enabled = enabled

    def __str__(self):
        return f"Tool: {self.name} (enabled={self.enabled})"


t = Tool("web_search")
print(t)