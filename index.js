const child_process = require("child_process")
const fs = require("fs")
const tmp = require("tmp")
const decamelize = require("decamelize")
const path = require("path")
const bent = require("bent")

const getJSON = bent("json")

module.exports.startServer = async (config) => {
  let configPath
  let serverPort
  if (typeof config === "string") {
    configPath = config
    const configContent = fs.readFileSync(configPath).toString()
    serverPort = parseInt(/^server-port=(.*)$/.match(configContent))
  } else {
    serverPort = config.serverPort
    const postgrestConfigContent = `${Object.entries(config)
      .map(([k, v]) => `${decamelize(k, "-")}="${v}"`)
      .join("\n")}`
    configPath = tmp.tmpNameSync() + ".conf"
    fs.writeFileSync(configPath, postgrestConfigContent)
  }

  const proc = child_process.spawn(
    path.resolve(__dirname, "postgrest"),
    [configPath],
    {
      shell: true,
      stdio: "inherit",
    }
  )

  let isClosed = false
  proc.on("close", (code) => {
    isClosed = true
  })

  await new Promise((resolve, reject) => {
    const processCloseTimeout = setTimeout(() => {
      if (isClosed) {
        reject("Postgrest didn't start properly")
      } else {
        reject(`Postgrest didn't respond`)
        proc.kill("SIGINT")
      }
    }, 5000) // 500ms to wait for start

    async function checkIfPostgrestRunning() {
      const result = await getJSON(`http://localhost:${serverPort}`).catch(
        () => null
      )
      if (result) {
        clearTimeout(processCloseTimeout)
        resolve()
      } else {
        setTimeout(checkIfPostgrestRunning, 50)
      }
    }
    checkIfPostgrestRunning()
  })

  return {
    stop: async () => {
      proc.kill("SIGINT")
    },
  }
}
