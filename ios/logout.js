;(async () => {
    const fm = FileManager.iCloud()
    const dir = fm.documentsDirectory()
    const credPath = fm.joinPath(dir, "credentials.json")
  
    // Check for credentials file
    if (!fm.fileExists(credPath)) {
      console.log("❗ credentials.json not found. Run SophosAutoLogin first.")
      return
    }
    await fm.downloadFile(credPath)
    let raw = fm.readString(credPath)
  
    // Load and parse credentials
    let credentials
    try {
      credentials = JSON.parse(raw)
      if (!Array.isArray(credentials)) throw new Error("Not an array")
    } catch (e) {
      console.error("❗ Failed to parse credentials.json:", e)
      return
    }
  
    if (credentials.length === 0) {
      console.log("ℹ️ No credentials stored. Nothing to logout.")
      return
    }
  
    console.log(`ℹ️ You have ${credentials.length} credential(s).`)
  
    // Confirm logout action
    let a = new Alert()
    a.title = "Logout All Accounts"
    a.message = `This will log out ${credentials.length} account(s).`
    a.addAction("Proceed")
    a.addCancelAction("Cancel")
    let choice = await a.presentAlert()
    if (choice !== 0) {
      console.log("🚪 Logout cancelled.")
      return
    }
  
    // Perform logout for each credential
    const ENDPOINT = "http://172.16.68.6:8090/httpclient.html"
    let successCount = 0
  
    for (let cred of credentials) {
      console.log(`🔄 Logging out ${cred.username}…`)
      let req = new Request(ENDPOINT)
      req.method = "POST"
      req.headers = { "Content-Type": "application/x-www-form-urlencoded" }
      let body = new URLSearchParams()
      body.append("mode", "193")
      body.append("username", cred.username)
      body.append("password", cred.password)
      body.append("a", Date.now().toString())
      req.body = body.toString()
  
      let txt
      try {
        txt = await req.loadString()
      } catch (e) {
        console.log(`❗ Network error for ${cred.username}: ${e}`)
        continue
      }
  
      let xml = new DOMParser().parseFromString(txt, "text/xml")
      let msg = xml.querySelector("message")?.textContent.trim() || ""
      if (msg.toLowerCase().includes("signed out")) {
        console.log(`✅ Logged out ${cred.username}`)
        successCount++
      } else {
        console.log(`⚠️ ${cred.username}: "${msg}"`)
      }
    }
  
    // Notify user of the outcome
    let n = new Notification()
    n.title = "Campus Logout"
    n.body = `Logged out ${successCount} of ${credentials.length} account(s).`
    await n.schedule()
    console.log(`📊 Done: ${successCount}/${credentials.length} logged out.`)
  })()
