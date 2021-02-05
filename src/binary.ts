import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

import axios from "axios";
import rimraf from "rimraf";
import tar from "tar";

const error = (msg: string | Error) => {
  console.error(msg);
  process.exit(1);
};

interface BinaryData {
  name?: string;
  installDirectory?: string;
}

class Binary {
  url: string;
  name?: string;
  installDirectory: string;
  binaryDirectory?: string;
  binaryPath?: string;
  constructor(url: string, data: BinaryData) {
    let errors: string[] = [];

    try {
      new URL(url);
    } catch (err) {
      errors.push(err.message);
    }

    if (!data.installDirectory && !data.name) {
      errors.push("You must specify either name or installDirectory");
    }
    if (errors.length > 0) {
      errors.unshift("Your Binary constructor is invalid:");
      error(errors.join("\n"));
    }

    this.url = url;
    this.name = data.name || undefined;
    this.installDirectory = data.installDirectory || join(__dirname, "bin");
    this.binaryDirectory = undefined;
    this.binaryPath = undefined;
  }

  _getInstallDirectory() {
    if (!existsSync(this.installDirectory)) {
      mkdirSync(this.installDirectory, { recursive: true });
    }
    return this.installDirectory;
  }

  _getBinaryDirectory() {
    const installDirectory = this._getInstallDirectory();
    const binaryDirectory = join(installDirectory, "bin");
    if (existsSync(binaryDirectory)) {
      this.binaryDirectory = binaryDirectory;
    } else {
      error(`You have not installed ${this.name ? this.name : "this package"}`);
    }
    return this.binaryDirectory;
  }

  _getBinaryPath() {
    if (!this.binaryPath) {
      const binaryDirectory = this._getBinaryDirectory();
      this.binaryPath = join(<string>binaryDirectory, <string>this.name);
    }

    return this.binaryPath;
  }

  async _handleDownload() {
    try {
      const res = await axios({ url: this.url, responseType: "stream" });
      res.data.pipe(tar.x({ strip: 1, C: this.binaryDirectory }));

      console.log(
        `${this.name ? this.name : "Your package"} has been installed!`
      );
    } catch (err) {
      error(`Error fetching release: ${err.message}`);
    }
  }

  install() {
    const dir = this._getInstallDirectory();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.binaryDirectory = join(dir, "bin");

    if (existsSync(this.binaryDirectory)) {
      rimraf.sync(this.binaryDirectory);
    }

    mkdirSync(this.binaryDirectory, { recursive: true });

    const installed = this._handleDownload();
    return installed;
  }

  uninstall() {
    if (existsSync(this._getInstallDirectory())) {
      rimraf.sync(this.installDirectory);
      console.log(
        `${this.name ? this.name : "Your package"} has been uninstalled`
      );
    }
  }

  run() {
    const binaryPath = this._getBinaryPath();
    const [, , ...args] = process.argv;

    const options: any = { cwd: process.cwd(), stdio: "inherit" };

    const result = spawnSync(binaryPath, args, options);

    if (result.error) {
      error(result.error);
    }

    process.exit(<number>result.status);
  }
}

export default Binary;
