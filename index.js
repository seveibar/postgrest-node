const child_process = require("child_process")
const fs = require("fs")
const tmp = require("tmp")
const decamelize = require("decamelize")
const path = require("path")
const bent = require("bent")

const getJSON = bent("json")

module.exports.startServer = async (config, processOptions = {}) => {
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
    }
  )

  proc.stdout.on("data", (data) => {
    console.log(`postgrest stdout: ${data}`)
  })

  proc.stderr.on("data", (data) => {
    console.log(`postgrest stderr: ${data}`)
  })

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
    }, processOptions.healthWaitTime || parseInt(process.env.POSTGRES_HEALTH_WAIT_TIME) || 5000) // 5s to wait for start

    let backoff = 50
    async function checkIfPostgrestRunning() {
      const result = await getJSON(`http://localhost:${serverPort}`).catch(
        () => null
      )
      if (result) {
        clearTimeout(processCloseTimeout)
        resolve()
      } else {
        setTimeout(checkIfPostgrestRunning, backoff)
        backoff = Math.min(backoff + 50, 250)
      }
    }
    checkIfPostgrestRunning()
  })

  return {
    proc,
    stop: async () => {
      proc.kill("SIGINT")
    },
  }
}
