const octokit = require("./octokit"),
  fetch = require("node-fetch"),
  unzip = require("unzip"),
  path = require("path"),
  fs = require("fs-extra"),
  os = require("os");

const unzipFile = async (file, output) => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(
        unzip.Extract({
          path: output
        })
      )
      .on("close", resolve);
  });
};

(async () => {
  const _ = console.log;
  _("Installing CustomSpotify...");
  _("Determining Spotify install path");
  _();
  _("Operating Systems Supported --");
  _("\t* Windows");
  _("\t* macOS");
  _("\t!! NOT LINUX !! Open a PR if you wish to have Linux support");
  _();

  let installPath = "";
  switch (os.platform()) {
    case "darwin":
      _("Detected macOS!");
      installPath = path.resolve(
        "/Applications",
        "Spotify.app",
        "Contents",
        "Resources",
        "Apps"
      );
      break;
    case "win32":
      _("Detected Windows!");
      installPath = path.resolve(process.env.APPDATA, "Spotify", "Apps");
      break;
  }
  if (installPath === "" || !fs.existsSync(installPath)) {
    _(
      "Spotify install was not detected. Please install Spotify to /Applications/Spotify.app"
    );
    process.exit(1);
  }
  _();
  const zlinkOutputPath = path.join(installPath, "zlink");
  if (fs.existsSync(zlinkOutputPath)) {
    _("Removing existing zlink directory");
    await fs.remove(zlinkOutputPath);
    _("Removed!");
  }
  if (fs.existsSync(path.join(installPath, "zlink.spa.bak"))) {
    _("Moving old zlink backup to current");
    await fs.move(
      path.join(installPath, "zlink.spa.bak"),
      path.join(installPath, "zlink.spa")
    );
  }
  _("Unzipping zlink.spa");
  const zlinkPath = path.join(installPath, "zlink.spa");
  await unzipFile(zlinkPath, zlinkOutputPath);

  const result = await octokit.repos.getLatestRelease({
    owner: "CustomSpotify",
    repo: "CustomSpotify"
  });
  const release = result.data;
  _("We found a release on the CustomSpotify/CustomSpotify repo!");
  _(release.name);

  const injectorAsset = release.assets.find(i => i.name === "injector.js");
  const res = await fetch(injectorAsset.browser_download_url);
  const text = await res.text();
  await fs.writeFile(path.join(zlinkOutputPath, "injector.js"), text, "utf8");
  _();
  _("Downloaded injector.js from latest GitHub release");
  _();
  _("Injecting script into zlink index.html");

  let zlinkIndex = await fs.readFile(
    path.join(zlinkOutputPath, "index.html"),
    "utf8"
  );
  zlinkIndex = zlinkIndex.replace(
    `"/zlink.bundle.js"></script>`,
    `"/zlink.bundle.js"></script><script src="/injector.js"></script>`
  );
  await fs.writeFile(
    path.join(zlinkOutputPath, "index.html"),
    zlinkIndex,
    "utf8"
  );
  _(
    "Moving zlink.spa to zlink.spa.bak (to make Spotify load the unzipped zlink folder)"
  );
  await fs.move(
    path.join(installPath, "zlink.spa"),
    path.join(installPath, "zlink.spa.bak")
  );
  _("That is it! CustomSpotify should be completely installed.");
  _("Just restart Spotify, and you're off!");
})();
