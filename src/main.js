import plugin from '../plugin.json';
const { formatFromString } = require('@quilicicf/markdown-formatter');

const pluginId = plugin.id;
const appSettings = acode.require("settings");


class AcodeMarkdownFormat {
    worker = null;

    constructor() {
        this.run = this.run.bind(this);
    }

    static inferParser(filename) {
        switch (filename.slice(filename.lastIndexOf(".") + 1)) {
            case "md":
                return "md";

            default:
                return null;
        }
    }

    async init() {
        const extensions = ["md"];
        acode.registerFormatter(pluginId, extensions, this.run);
    }

    async run() {
        const { editor, activeFile } = editorManager;
        const { session } = activeFile;
        const code = editor.getValue();
        const cursorPos = editor.getCursorPosition();
        const parser = AcodeMarkdownFormat.inferParser(activeFile.name);
        const cursorOptions = {
            parser,
            cursorOffset: this.#cursorPosTocursorOffset(cursorPos),
            filepath: activeFile.name,
            tabWidth: appSettings.value.tabSize,
        };
        const { value } = await formatFromString(code);
        this.#setValue(session, value);
    }

    async destroy() {
        acode.unregisterFormatter(plugin.id);
    }

    #cursorPosTocursorOffset(cursorPos) {
        let { row, column } = cursorPos;
        const { editor } = editorManager;
        const lines = editor.getValue().split("\n");
        for (let i = 0; i < row - 1; i++) {
            column += lines[i].length;
        }
        return column;
    }

    #cursorOffsetTocursorPos(cursorOffset) {
        const { editor } = editorManager;
        const lines = editor.getValue().split("\n");
        let row = 0;
        let column = 0;
        for (let i = 0; i < lines.length; i++) {
            if (column + lines[i].length >= cursorOffset) {
                row = i;
                column = cursorOffset - column;
                break;
            }
            column += lines[i].length;
        }
        return {
            row,
            column,
        };
    }

    #setValue(session, formattedCode) {
        const { $undoStack, $redoStack, $rev, $mark } = Object.assign(
            {},
            session.getUndoManager()
        );
        session.setValue(formattedCode);
        const undoManager = session.getUndoManager();
        undoManager.$undoStack = $undoStack;
        undoManager.$redoStack = $redoStack;
        undoManager.$rev = $rev;
        undoManager.$mark = $mark;
        const { row, column } = this.#cursorOffsetTocursorPos(
            formattedCode.cursorOffset
        );
        session.selection.moveCursorTo(row, column);
    }
}

if (window.acode) {
  const acodePlugin = new AcodeMarkdownFormat();
  acode.setPluginInit(plugin.id, (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    acodePlugin.baseUrl = baseUrl;
    acodePlugin.init($page, cacheFile, cacheFileUrl);
  });
  acode.setPluginUnmount(plugin.id, () => {
    acodePlugin.destroy();
  });
}