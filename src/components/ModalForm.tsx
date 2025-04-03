import {useEditor} from '@portabletext/editor'
import {Card, Dialog, Portal} from '@sanity/ui'
import {type Dispatch, type JSX, type SetStateAction, useCallback} from 'react'
import {type ArrayOfObjectsInputProps, FormInput, type Path} from 'sanity'

type ModalFormProps = ArrayOfObjectsInputProps & {
  editablePath: Path
  setEditablePath: Dispatch<SetStateAction<Path | null>>
  title?: string
}

export function ModalForm(props: ModalFormProps): JSX.Element {
  const {editablePath, setEditablePath, title = 'Edit Content', ...restProps} = props
  const path = [...props.path, ...editablePath]
  const editor = useEditor()

  console.log(editablePath)
  console.log(props)

  const onClose = useCallback(() => {
    setEditablePath(null)
    editor.send({type: 'focus'})
  }, [editor, setEditablePath])

  return (
    <Portal>
      <Dialog
        header={title}
        id="dialog-edit-content"
        zOffset={1000}
        onClickOutside={onClose}
        onClose={onClose}
        width={1}
      >
        <Card padding={4} radius={2}>
          <FormInput {...restProps} absolutePath={path} />
        </Card>
      </Dialog>
    </Portal>
  )
}
