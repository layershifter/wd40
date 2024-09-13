import fs from 'node:fs';

export class FileSystemService {
  async readFile(path: string) {
    // DO NOT USE fs.promises.readFile here, it's slow!
    return fs.readFileSync(path, 'utf-8');
  }
}
