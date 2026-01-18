'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'

interface Todo {
  id: string
  note_id: string
  text: string
  completed: boolean
  user_id: string
  created_at: string
}

interface NoteImage {
  id: string
  note_id: string
  url: string
  user_id: string
  created_at: string
}

interface Note {
  id: string
  date: string
  title: string | null
  subtitle: string | null
  content: string | null
  user_id: string
  user?: {
    id: string
    username: string | null
    full_name: string | null
  }
}

interface NoteEditorProps {
  date: string
  userNote: Note | null
  allNotes: Note[]
  userId: string
}

// Color palette for different users
const userColors = [
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', name: 'text-blue-700' },
  { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', name: 'text-green-700' },
  { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', name: 'text-purple-700' },
  { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', name: 'text-yellow-700' },
  { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', name: 'text-pink-700' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', name: 'text-indigo-700' },
]

export default function NoteEditor({ date, userNote, allNotes, userId }: NoteEditorProps) {
  const [title, setTitle] = useState(userNote?.title || '')
  const [subtitle, setSubtitle] = useState(userNote?.subtitle || '')
  const [content, setContent] = useState(userNote?.content || '')
  const [todos, setTodos] = useState<Todo[]>([])
  const [images, setImages] = useState<NoteImage[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Get color for a user
  const getUserColor = (userId: string) => {
    const uniqueUserIds = Array.from(new Set(allNotes.map(n => n.user_id)))
    const index = uniqueUserIds.indexOf(userId)
    return userColors[index % userColors.length]
  }

  // Get user name
  const getUserName = (note: Note) => {
    if (note.user_id === userId) return 'You'
    return note.user?.full_name || note.user?.username || 'Unknown'
  }

  useEffect(() => {
    if (userNote) {
      setTitle(userNote.title || '')
      setSubtitle(userNote.subtitle || '')
      setContent(userNote.content || '')
    }
    loadAllTodos()
    loadAllImages()
  }, [date, allNotes])

  const loadAllTodos = async () => {
    if (allNotes.length === 0) return
    const noteIds = allNotes.map(n => n.id)
    const { data } = await supabase
      .from('todos')
      .select('*')
      .in('note_id', noteIds)
      .order('created_at', { ascending: true })
    if (data) setTodos(data)
  }

  const loadAllImages = async () => {
    if (allNotes.length === 0) return
    const noteIds = allNotes.map(n => n.id)
    const { data } = await supabase
      .from('note_images')
      .select('*')
      .in('note_id', noteIds)
      .order('created_at', { ascending: true })
    if (data) setImages(data)
  }

  const saveNote = async () => {
    setSaving(true)
    try {
      if (userNote) {
        // Update existing note
        await supabase
          .from('notes')
          .update({
            title: title || null,
            subtitle: subtitle || null,
            content: content || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userNote.id)
      } else {
        // Create new note
        const { data: newNote } = await supabase
          .from('notes')
          .insert({
            user_id: userId,
            date,
            title: title || null,
            subtitle: subtitle || null,
            content: content || null,
          })
          .select()
          .single()

        if (newNote) {
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSaving(false)
    }
  }

  const addTodo = async () => {
    if (!newTodo.trim() || !userNote?.id) return
    const { data } = await supabase
      .from('todos')
      .insert({
        note_id: userNote.id,
        user_id: userId,
        text: newTodo.trim(),
        order_index: todos.filter(t => t.note_id === userNote.id).length,
      })
      .select()
      .single()

    if (data) {
      setTodos([...todos, data])
      setNewTodo('')
    }
  }

  const toggleTodo = async (todoId: string, completed: boolean) => {
    await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', todoId)
    setTodos(todos.map(t => t.id === todoId ? { ...t, completed: !completed } : t))
  }

  const deleteTodo = async (todoId: string) => {
    await supabase.from('todos').delete().eq('id', todoId)
    setTodos(todos.filter(t => t.id !== todoId))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userNote?.id) return
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userNote.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('note-images')
        .getPublicUrl(fileName)

      const { data } = await supabase
        .from('note_images')
        .insert({
          note_id: userNote.id,
          user_id: userId,
          url: publicUrl,
          order_index: images.filter(img => img.note_id === userNote.id).length,
        })
        .select()
        .single()

      if (data) {
        setImages([...images, data])
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteImage = async (imageId: string) => {
    await supabase.from('note_images').delete().eq('id', imageId)
    setImages(images.filter(img => img.id !== imageId))
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
        </h2>
      </div>

      {/* Your Note Section */}
      <div className="space-y-4">
        <div className="border-l-4 border-gray-900 pl-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Your Note</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveNote}
              className="w-full text-2xl font-semibold border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none pb-2"
            />
            <input
              type="text"
              placeholder="Subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              onBlur={saveNote}
              className="w-full text-lg text-gray-600 border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none pb-2"
            />
            <textarea
              placeholder="Write your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={saveNote}
              rows={6}
              className="w-full border-0 focus:outline-none resize-none text-gray-700 leading-relaxed"
            />
          </div>
        </div>

        {userNote && (
          <>
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Todos</h3>
              <div className="space-y-2">
                {todos.map((todo) => {
                  const note = allNotes.find(n => n.id === todo.note_id)
                  const color = note ? getUserColor(note.user_id) : userColors[0]
                  const canEdit = todo.user_id === userId || (note && note.user_id === userId)
                  return (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-2 p-2 rounded ${color.bg} ${color.border} border-l-4`}
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => canEdit && toggleTodo(todo.id, todo.completed)}
                        disabled={!canEdit}
                        className="mt-1"
                      />
                      <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : color.text}`}>
                        {todo.text}
                      </span>
                      <span className={`text-xs ${color.name} opacity-75`}>
                        {note ? getUserName(note) : 'Unknown'}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a todo..."
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                    className="flex-1 border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none pb-1 text-sm"
                  />
                  <button
                    onClick={addTodo}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Images</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {images.map((img) => {
                  const note = allNotes.find(n => n.id === img.note_id)
                  const color = note ? getUserColor(note.user_id) : userColors[0]
                  const canEdit = img.user_id === userId || (note && note.user_id === userId)
                  return (
                    <div key={img.id} className={`relative group border-2 ${color.border} rounded`}>
                      <img
                        src={img.url}
                        alt="Note image"
                        className="w-full h-48 object-cover rounded"
                      />
                      {canEdit && (
                        <button
                          onClick={() => deleteImage(img.id)}
                          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      )}
                      <span className={`absolute bottom-2 left-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded ${color.name}`}>
                        {note ? getUserName(note) : 'Unknown'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <label className="inline-block px-4 py-2 text-sm bg-gray-100 rounded cursor-pointer hover:bg-gray-200">
                {loading ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Friends' Notes Section */}
      {allNotes.filter(n => n.user_id !== userId).length > 0 && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <h3 className="text-sm font-medium text-gray-700">Friends' Notes</h3>
          {allNotes
            .filter(n => n.user_id !== userId)
            .map((note) => {
              const color = getUserColor(note.user_id)
              return (
                <div
                  key={note.id}
                  className={`border-l-4 ${color.border} ${color.bg} p-4 rounded-r`}
                >
                  <div className={`text-xs font-medium ${color.name} mb-2`}>
                    {getUserName(note)}
                  </div>
                  {note.title && (
                    <h4 className={`text-xl font-semibold ${color.text} mb-1`}>
                      {note.title}
                    </h4>
                  )}
                  {note.subtitle && (
                    <h5 className={`text-lg ${color.text} mb-2 opacity-80`}>
                      {note.subtitle}
                    </h5>
                  )}
                  {note.content && (
                    <p className={`${color.text} leading-relaxed whitespace-pre-wrap`}>
                      {note.content}
                    </p>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {saving && (
        <div className="text-sm text-gray-500">Saving...</div>
      )}
    </div>
  )
}
