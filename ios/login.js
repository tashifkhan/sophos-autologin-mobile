;(async () => {
    // Setup file manager and paths
    const fm = FileManager.iCloud()
    const dir = fm.documentsDirectory()
    const credPath = fm.joinPath(dir, "credentials.json")
  
    // if no file, create an empty array
    if (!fm.fileExists(credPath)) {
      fm.writeString(credPath, "[]")
      console.log("🔧 Created credentials.json template.")
    }
    // make sure it’s downloaded
    await fm.downloadFile(credPath)
  
    // Load and parse credentials
    let raw = fm.readString(credPath)
    let credentials
    try {
      credentials = JSON.parse(raw)
      if (!Array.isArray(credentials)) throw new Error("Not an array")
    } catch (e) {
      console.error("❗ credentials.json parse error:", e)
      credentials = []
    }
  
    // Helper function to prompt for and add credentials
    async function promptAdd() {
      while (true) {
        let a = new Alert()
        a.title = "Add Credential"
        a.message = "Enter username & password"
        a.addTextField("username")
        a.addTextField("password")
        a.addAction("Save")
        a.addCancelAction("Cancel")
        let idx = await a.presentAlert()
        if (idx !== 0) break  // Cancel tapped
        let u = a.textFieldValue(0).trim()
        let p = a.textFieldValue(1)
        if (u && p) {
          credentials.push({ username: u, password: p })
          console.log(`➕ Added ${u}`)
        } else {
          console.log("⚠️ Empty field, not added.")
        }
      }
      // save back to iCloud
      fm.writeString(credPath, JSON.stringify(credentials, null, 2))
      console.log(`💾 Stored ${credentials.length} credential(s).`)
    }
  
    // Handle first run or manage existing credentials
    if (credentials.length === 0) {
      console.log("ℹ️ No credentials found, let's add some.")
      await promptAdd()
    } else {
      console.log(`ℹ️ You have ${credentials.length} credential(s) stored.`)
      let m = new Alert()
      m.title = "Manage Credentials"
      m.message = `You have ${credentials.length} credential(s) stored.`
      m.addAction("Login now")
      m.addAction("Add more")
      m.addCancelAction("Exit")
      let choice = await m.presentAlert()
      if (choice === 1) {
        await promptAdd()
      } else if (choice === 2) {
        console.log("🚪 Exiting without login.")
        return
      }
      // if choice===0 we fall through to login
    }
  
    // Perform login attempts
    const ENDPOINT = "http://172.16.68.6:8090/httpclient.html"
    async function login() {
      for (let cred of credentials) {
        console.log(`🔄 Trying ${cred.username}…`)
        let req = new Request(ENDPOINT)
        req.method = "POST"
        req.headers = { "Content-Type": "application/x-www-form-urlencoded" }
        let body = new URLSearchParams()
        body.append("mode", "191")
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
  
        if (msg.includes("Login failed")) {
          console.log(`❌ Login failed for ${cred.username}`)
        } else if (msg.toLowerCase().includes("signed in")) {
          console.log(`✅ Connected as ${cred.username}`)
          let n = new Notification()
          n.title = "Campus Login"
          n.body = `Connected as ${cred.username}`
          await n.schedule()
          return true
        } else {
          console.log(`⚠️ Unknown response for ${cred.username}: "${msg}"`)
        }
      }
      console.log("🔴 All login attempts failed.")
      let n = new Notification()
      n.title = "Campus Login"
      n.body = "All login attempts failed"
      await n.schedule()
      return false
    }
  
    await login()
  })()
