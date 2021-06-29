import React, {
  forwardRef,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { EditorHandle, EditorProps } from "../generic/types/applicationSpecific";
import type { Editor, EditorChangeLinkedList, EditorConfiguration } from "codemirror";
import { UnControlled as CodeMirror } from "react-codemirror2";
import { createUseStyles } from "react-jss";

import "cm-show-invisibles";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import MonacoEditor, { monaco } from "react-monaco-editor";

export const replaceInvisibleCharacters = (str: string): string =>
  str.replace(/\n/g, "¬").replace(/ /g, "·");

const useCodeMirrorStyles = createUseStyles({
  codeMirrorContainer: {
    border: "1px solid #ccc",
    flex: "1",
    "& .CodeMirror": {
      height: "150px",
    },
  },
});

declare module "codemirror" {
  interface EditorConfiguration {
    showInvisibles: true; // provided by addon 'cm-show-invisibles'
  }
}

const editorConfiguration: EditorConfiguration = {
  lineNumbers: true,
  showInvisibles: true,
};

export const makeCodeMirrorComponent = <OpT extends unknown>(
  applyOperationToCodeMirror: (operation: OpT, editor: Editor) => void,
  applyOperationToMonaco: (operation: OpT, editor: monaco.editor.IStandaloneCodeEditor) => void,
  operationFromCodeMirrorChanges: (changes: EditorChangeLinkedList[], editor: Editor) => OpT,
  operationFromMonacoChanges: (event: monaco.editor.IModelContentChangedEvent, editor: monaco.editor.IStandaloneCodeEditor, prev: string) => {operation: OpT, newCode: string},
): ForwardRefExoticComponent<
  PropsWithoutRef<EditorProps<string, OpT>> & RefAttributes<EditorHandle<OpT>>
> =>
  forwardRef<EditorHandle<OpT>, EditorProps<string, OpT>>(({ snapshot, onUserChange }, ref) => {
    const codeMirrorClasses = useCodeMirrorStyles();

    const [initialText] = useState(() => snapshot);

    const [editor, setEditor] = useState<Editor | undefined>(undefined);
    const [monacoEditor, setMonacoEditor] = useState<monaco.editor.IStandaloneCodeEditor | undefined>(undefined);

    const applyingOperationFromServerRef = useRef<boolean>(false);

    const onChanges = useCallback(
      (editor: Editor, changes: EditorChangeLinkedList[]) => {
        if (!applyingOperationFromServerRef.current) {
          onUserChange(operationFromCodeMirrorChanges(changes, editor));
        }
      },
      [onUserChange, applyingOperationFromServerRef],
    );

    let prev = "Lorem ipsum"
    const onMonacoChange = useCallback(
      (editor: monaco.editor.IStandaloneCodeEditor, event: monaco.editor.IModelContentChangedEvent) => {
        if (!applyingOperationFromServerRef.current) {
          console.log(event)
          const c = operationFromMonacoChanges(event, editor, prev)
          prev = c.newCode
          console.log("monaco emits:", c)
          onUserChange(c.operation);
        }
      },
      [onUserChange, applyingOperationFromServerRef],
    );

    useEffect(() => {
      if (editor !== undefined) {
        editor.on("changes", onChanges);
        return () => {
          editor.off("changes", onChanges);
        };
      }
    }, [editor, onChanges]);

    useImperativeHandle(ref, () => ({
      applyOperation(textOperation) {
        if (editor !== undefined) {
          applyingOperationFromServerRef.current = true;
          applyOperationToCodeMirror(textOperation, editor);
          applyOperationToMonaco(textOperation, monacoEditor!);
          applyingOperationFromServerRef.current = false;
        }
      },
    }));

    const editorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
      console.log("mounted", editor)
      editor.onDidChangeModelContent(e => onMonacoChange(editor, e))
      setMonacoEditor(editor)
    }

    return (
      <div>
        <CodeMirror
          className={codeMirrorClasses.codeMirrorContainer}
          options={editorConfiguration}
          value={initialText}
          editorDidMount={setEditor}
        />
        <MonacoEditor
        width="420"
        height="150"
        defaultValue={initialText}
        editorDidMount={editorDidMount}></MonacoEditor>
      </div>
    );
  });

export const renderSnapshot = (snapshot: string): React.ReactNode => (
  <span
    style={{
      whiteSpace: "pre",
      backgroundColor: "white",
      fontFamily: "monospace",
    }}
  >
    {replaceInvisibleCharacters(snapshot)}
  </span>
);

export const initialText = "Lorem ipsum";
