
export class Cmd {
  constructor()
  {
    this.cmds = {};
    this.text = "";
  }
  
  addCommand(name, action)
  {
    this.cmds[name] = action;
  }
  
  addText(text)
  {
    this.text += text;
  }
  
  exec()
  {
    const cmds = this.text.split(";");
    
    for (const cmd of cmds) {
      const args = cmd.split(" ");
      const name = args[0];
      if (this.cmds[name])
        this.cmds[name](args);
    }
    
    this.text = "";
  }
};
