import { type FileSystemService } from './FileSystemService';

export function createFileSystemServiceMock(
  files: Record<string, string>
): FileSystemService {
  return {
    readFile: async (path: string) => {
      const file = files[path];

      if (file === undefined) {
        throw new Error(`[FileSystemServiceMock] File not found: ${path}`);
      }

      return file;
    },
  };
}
