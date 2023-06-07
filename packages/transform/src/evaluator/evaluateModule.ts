import { addVirtualModule } from './resolvePlugin';

export async function evaluateModule<T>(
  filename: string,
  sourceCode: string,
  runner: ViteNodeRunner
): Promise<T> {
  const { disposeModule, virtualModuleName } = addVirtualModule(
    filename,
    sourceCode
  );
  // console.log('sourceCode', sourceCode);
  const result = await runner.executeFile(virtualModuleName);
  // console.log('evaluateModule:result', result.__module);
  disposeModule();

  return result;
}
