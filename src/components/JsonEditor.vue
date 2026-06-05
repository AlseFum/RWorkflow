<template>
  <div ref="editorHost" class="json-editor-host"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, rectangularSelection, placeholder } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'

const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const editorHost = ref(null)
let view = null
const readOnlyComp = new Compartment()

const createState = (doc) => EditorState.create({
  doc,
  extensions: [
    lineNumbers(),
    highlightActiveLine(),
    highlightSpecialChars(),
    drawSelection(),
    rectangularSelection(),
    foldGutter(),
    indentOnInput(),
    bracketMatching(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    json(),
    linter(jsonParseLinter()),
    oneDark,
    readOnlyComp.of(EditorState.readOnly.of(false)),
    placeholder('// JSON5'),
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        emit('update:modelValue', update.state.doc.toString())
      }
    }),
  ],
})

onMounted(() => {
  view = new EditorView({
    state: createState(props.modelValue),
    parent: editorHost.value,
  })
})

watch(() => props.modelValue, (val) => {
  if (view && val !== view.state.doc.toString()) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: val },
    })
  }
})

onUnmounted(() => {
  view?.destroy()
})
</script>

<style>
.json-editor-host {
  height: 100%;
  overflow: auto;
}
.json-editor-host .cm-editor {
  height: 100%;
  font-size: 0.72rem;
}
.json-editor-host .cm-scroller {
  overflow: auto;
}
.json-editor-host .cm-gutters {
  font-size: 0.65rem;
}
</style>
