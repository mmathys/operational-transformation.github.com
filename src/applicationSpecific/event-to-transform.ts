import { TextOperation } from "ot";
import type { monaco } from "react-monaco-editor";


export default function convertChangeEventToOperation(
  editor: monaco.editor.IStandaloneCodeEditor,
  changeEvent: monaco.editor.IModelContentChangedEvent,
  liveOperationCode: string,
) {
  console.log(editor, changeEvent)
  let otOperation: TextOperation;

  let composedCode = liveOperationCode;

  for (const change of changeEvent.changes) {
    const newOt = new TextOperation();
    const cursorStartOffset = editor.getModel()!.getOffsetAt({
      lineNumber: change.range.startLineNumber,
      column: change.range.startColumn
    })
    console.log("offset", change.range.startLineNumber, change.range.startColumn, cursorStartOffset)
    /* TODO not sure if that above
    const cursorStartOffset = lineAndColumnToIndex(
      composedCode.split(/\n/),
      change.range.startLineNumber,
      change.range.startColumn
      );
    */

    const retain = cursorStartOffset - newOt.targetLength;

    if (retain !== 0) {
      newOt.retain(retain);
    }

    if (change.rangeLength > 0) {
      newOt.delete(change.rangeLength);
    }

    if (change.text) {
      newOt.insert(change.text);
    }

    const remaining = composedCode.length - newOt.baseLength;
    if (remaining > 0) {
      newOt.retain(remaining);
    }

    otOperation = otOperation! ? otOperation!.compose(newOt) : newOt;

    console.log(liveOperationCode, otOperation)
    composedCode = otOperation!.apply(liveOperationCode);
  }

  return {
    operation: otOperation!,
    newCode: composedCode,
  };
}
