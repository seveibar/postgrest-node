const bent = require("bent")
const os = require("os")
const downloadFile = require("./download-file")
const path = require("path")
const fs = require("fs")
const tar = require("tar")
const xz = require("xz")

const getJSON = bent("json", {
  "User-Agent": "seveibar, postgrest-bin (an npm module)",
})

const platform = os.platform()
const arch = os.arch()

// Originally derived from the package.json, but that approach doesn't allow for
// any patches to the bindings... Maybe only sync major versions in the future?
// Either that or tag the releases for older version e.g. 1.2.3-postgrest6
const releaseVersionToUse = "7.0.1"

module.exports = async () => {
  const releaseAPIUrl = `https://api.github.com/repos/PostgREST/postgrest/releases/tags/v${releaseVersionToUse}`
  const { assets } = await getJSON(releaseAPIUrl)
  const myAsset = assets.find((asset) =>
    asset.name.includes(`${platform}-${arch}`)
  )
  if (!myAsset) {
    throw new Error(
      `Couldn't find postgrest version compatible with ${platform}-${arch}`
    )
  }

  if (platform === "windows") {
    throw new Error(
      "We didn't build windows support yet! Please make a PR https://github.com/seveibar/postgrest-bin"
    )
  }

  const downloadPath = path.resolve(__dirname, myAsset.name)
  const exePath = path.resolve(__dirname, "postgrest")

  if (fs.existsSync(exePath)) {
    return exePath
  }

  if (!fs.existsSync(path.join(__dirname, myAsset.name))) {
    console.log(`Downloading ${myAsset.name}...`)

    await downloadFile(
      myAsset.browser_download_url,
      path.resolve(__dirname, downloadPath)
    )
  }

  if (!fs.existsSync(path.join(__dirname, "extracted"))) {
    console.log(`extracting ${myAsset.name}...`)
    let tarXPath = downloadPath
    if (myAsset.name.endsWith(".xz")) {
      let newTarPath = path.join(__dirname, "postgrest.tar")
      const decomp = new xz.Decompressor()
      const readFile = fs.createReadStream(downloadPath)
      const writeFile = fs.createWriteStream(newTarPath)
      readFile.pipe(decomp).pipe(writeFile)
      fs.unlinkSync(tarXPath)
      tarXPath = newTarPath
      await new Promise((resolve) => writeFile.on("finish", resolve))
    }
    await tar.x({
      file: tarXPath,
    })
    fs.unlinkSync(tarXPath)

    if (!fs.existsSync(exePath)) {
      throw new Error(
        `For some reason, after extracting postgrest there was no executable!`
      )
    }
  }

  return exePath
}

if (!module.parent) {
  module.exports().then(() => {})
}
