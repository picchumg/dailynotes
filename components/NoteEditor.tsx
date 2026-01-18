'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'

interface TextBlock {
  id: string
  note_id: string
  content: string
  user_id: string
  created_at: string
  order_index: number
}

interface Todo {
  id: string
  note_id: string
  text: string
  completed: boolean
  user_id: string
  created_at: string
  order_index: number
}

interface NoteImage {
  id: string
  note_id: string
  url: string
  user_id: string
  created_at: string
  order_index: number
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

interface Profile {
  id: string
  username: string | null
  full_name: string | null
}

interface NoteEditorProps {
  date: string
  sharedNote: Note | null
  friendIds: string[]
  profiles: Profile[]
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

type ContentBlock = 
  | { type: 'text'; data: TextBlock }
  | { type: 'todo'; data: Todo }
  | { type: 'image'; data: NoteImage }

export default function NoteEditor({ date, sharedNote, friendIds, profiles, userId }: NoteEditorProps) {
  const [title, setTitle] = useState(sharedNote?.title || '')
  const [subtitle, setSubtitle] = useState(sharedNote?.subtitle || '')
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [images, setImages] = useState<NoteImage[]>([])
  const [showInsertMenu, setShowInsertMenu] = useState<number | null>(null) // Index where to insert
  const [insertingTodo, setInsertingTodo] = useState<number | null>(null)
  const [newTodoText, setNewTodoText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Get color for a user
  const getUserColor = (userId: string) => {
    const sortedIds = [...friendIds].sort()
    const index = sortedIds.indexOf(userId)
    return userColors[index % userColors.length]
  }

  // Get user name
  const getUserName = (targetUserId: string) => {
    if (targetUserId === userId) return 'You'
    const profile = profiles.find(p => p.id === targetUserId)
    return profile?.full_name || profile?.username || 'Unknown'
  }

  useEffect(() => {
    if (sharedNote) {
      setTitle(sharedNote.title || '')
      setSubtitle(sharedNote.subtitle || '')
    } else {
      setTitle('')
      setSubtitle('')
    }
    loadTextBlocks()
    loadTodos()
    loadImages()
  }, [date, sharedNote?.id])

  // Poll for updates every 2 seconds
  useEffect(() => {
    if (!sharedNote?.id) return
    
    const interval = setInterval(() => {
      loadTextBlocks()
      loadTodos()
      loadImages()
    }, 2000)

    return () => clearInterval(interval)
  }, [sharedNote?.id])

  const loadTextBlocks = async () => {
    if (!sharedNote?.id) {
      setTextBlocks([])
      return
    }
    const { data } = await supabase
      .from('text_blocks')
      .select('*')
      .eq('note_id', sharedNote.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
    
    if (data) {
      setTextBlocks(data)
    } else {
      setTextBlocks([])
    }
  }

  const loadTodos = async () => {
    if (!sharedNote?.id) {
      setTodos([])
      return
    }
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('note_id', sharedNote.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
    
    if (data) {
      setTodos(data)
    } else {
      setTodos([])
    }
  }

  const loadImages = async () => {
    if (!sharedNote?.id) {
      setImages([])
      return
    }
    const { data } = await supabase
      .from('note_images')
      .select('*')
      .eq('note_id', sharedNote.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
    if (data) setImages(data)
  }

  const saveNote = async () => {
    setSaving(true)
    try {
      if (sharedNote) {
        await supabase
          .from('notes')
          .update({
            title: title || null,
            subtitle: subtitle || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sharedNote.id)
      } else {
        const { data: newNote } = await supabase
          .from('notes')
          .insert({
            user_id: userId,
            date,
            title: title || null,
            subtitle: subtitle || null,
            content: null,
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

  const getMaxOrderIndex = () => {
    return Math.max(
      ...textBlocks.map(b => b.order_index),
      ...todos.map(t => t.order_index),
      ...images.map(i => i.order_index),
      -1
    )
  }

  const insertTextBlock = async (afterIndex: number) => {
    if (!sharedNote) {
      const { data: newNote } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          date,
          title: null,
          subtitle: null,
          content: null,
        })
        .select()
        .single()
      
      if (newNote) {
        window.location.reload()
        return
      }
      return
    }

    const allBlocks = getAllBlocks()
    const insertOrder = afterIndex < allBlocks.length 
      ? allBlocks[afterIndex].data.order_index + 0.5
      : getMaxOrderIndex() + 1

    const { data, error } = await supabase
      .from('text_blocks')
      .insert({
        note_id: sharedNote.id,
        user_id: userId,
        content: '',
        order_index: Math.floor(insertOrder),
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding text block:', error)
      return
    }

    if (data) {
      setTextBlocks([...textBlocks, data])
      setShowInsertMenu(null)
    }
  }

  const updateTextBlock = async (blockId: string, content: string) => {
    await supabase
      .from('text_blocks')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', blockId)
    setTextBlocks(textBlocks.map(b => b.id === blockId ? { ...b, content } : b))
  }

  const deleteTextBlock = async (blockId: string) => {
    await supabase.from('text_blocks').delete().eq('id', blockId)
    setTextBlocks(textBlocks.filter(b => b.id !== blockId))
  }

  const insertTodo = async (afterIndex: number) => {
    if (!sharedNote) {
      const { data: newNote } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          date,
          title: null,
          subtitle: null,
          content: null,
        })
        .select()
        .single()
      
      if (newNote) {
        window.location.reload()
        return
      }
      return
    }

    if (!newTodoText.trim()) return

    const allBlocks = getAllBlocks()
    const insertOrder = afterIndex < allBlocks.length 
      ? allBlocks[afterIndex].data.order_index + 0.5
      : getMaxOrderIndex() + 1

    const { data, error } = await supabase
      .from('todos')
      .insert({
        note_id: sharedNote.id,
        user_id: userId,
        text: newTodoText.trim(),
        order_index: Math.floor(insertOrder),
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding todo:', error)
      return
    }

    if (data) {
      setTodos([...todos, data])
      setNewTodoText('')
      setInsertingTodo(null)
      setShowInsertMenu(null)
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, afterIndex: number) => {
    if (!e.target.files) return
    const file = e.target.files[0]
    if (!file) return

    if (!sharedNote) {
      const { data: newNote } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          date,
          title: null,
          subtitle: null,
          content: null,
        })
        .select()
        .single()
      
      if (newNote) {
        window.location.reload()
        return
      }
    }

    if (!sharedNote?.id) return

    setLoading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${sharedNote.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('note-images')
        .getPublicUrl(fileName)

      const allBlocks = getAllBlocks()
      const insertOrder = afterIndex < allBlocks.length 
        ? allBlocks[afterIndex].data.order_index + 0.5
        : getMaxOrderIndex() + 1

      const { data } = await supabase
        .from('note_images')
        .insert({
          note_id: sharedNote.id,
          user_id: userId,
          url: publicUrl,
          order_index: Math.floor(insertOrder),
        })
        .select()
        .single()

      if (data) {
        setImages([...images, data])
        setShowInsertMenu(null)
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

  // Get all blocks sorted by order_index
  const getAllBlocks = (): ContentBlock[] => {
    const blocks: ContentBlock[] = [
      ...textBlocks.map(b => ({ type: 'text' as const, data: b })),
      ...todos.map(t => ({ type: 'todo' as const, data: t })),
      ...images.map(i => ({ type: 'image' as const, data: i }))
    ]
    
    return blocks.sort((a, b) => a.data.order_index - b.data.order_index)
  }

  const allBlocks = getAllBlocks()

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
        </h2>
      </div>

      <div className="space-y-1">
        {/* Title */}
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveNote}
          className="w-full text-3xl font-bold border-0 focus:outline-none pb-2 text-gray-900 placeholder-gray-400"
        />

        {/* Subtitle */}
        <input
          type="text"
          placeholder="Subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onBlur={saveNote}
          className="w-full text-xl text-gray-600 border-0 focus:outline-none pb-2 placeholder-gray-400"
        />

        {/* Content blocks */}
        <div className="space-y-1 mt-4">
          {allBlocks.length === 0 && !showInsertMenu && (
            <div className="relative">
              <button
                onClick={() => setShowInsertMenu(0)}
                className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 w-full text-left"
              >
                <span className="text-lg">+</span>
                <span>Add block</span>
              </button>
            </div>
          )}

          {allBlocks.map((block, index) => {
            return (
              <div key={`${block.type}-${block.data.id}`} className="group">
                {block.type === 'text' && (
                  <div className="relative">
                    <textarea
                      placeholder="Start writing..."
                      value={block.data.content}
                      onChange={(e) => updateTextBlock(block.data.id, e.target.value)}
                      onBlur={() => {
                        if (!block.data.content.trim()) {
                          deleteTextBlock(block.data.id)
                        }
                      }}
                      rows={Math.max(1, block.data.content.split('\n').length)}
                      className="w-full border-0 focus:outline-none resize-none text-gray-700 leading-relaxed text-base placeholder-gray-400 min-h-[1.5rem]"
                    />
                    <button
                      onClick={() => deleteTextBlock(block.data.id)}
                      className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-lg"
                    >
                      ×
                    </button>
                  </div>
                )}

                {block.type === 'todo' && (
                  <div className={`flex items-start gap-3 py-2 px-1 ${getUserColor(block.data.user_id).border} border-l-2 pl-3`}>
                    <input
                      type="checkbox"
                      checked={block.data.completed}
                      onChange={() => toggleTodo(block.data.id, block.data.completed)}
                      className="mt-1 w-4 h-4"
                    />
                    <span className={`flex-1 ${block.data.completed ? 'line-through text-gray-400' : getUserColor(block.data.user_id).text} text-base`}>
                      {block.data.text}
                    </span>
                    <button
                      onClick={() => deleteTodo(block.data.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-lg"
                    >
                      ×
                    </button>
                  </div>
                )}

                {block.type === 'image' && (
                  <div className="relative group my-4">
                    <img
                      src={block.data.url}
                      alt="Note image"
                      className="w-full max-w-2xl rounded-lg"
                    />
                    <button
                      onClick={() => deleteImage(block.data.id)}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 text-lg"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Insert menu after each block */}
                <div className="relative">
                  {showInsertMenu === index ? (
                    <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 my-1">
                      <button
                        onClick={() => {
                          setShowInsertMenu(null)
                          insertTextBlock(index)
                        }}
                        className="text-left px-3 py-2 hover:bg-white rounded flex items-center gap-2"
                      >
                        <span>📝</span>
                        <span>Text</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowInsertMenu(null)
                          setInsertingTodo(index)
                        }}
                        className="text-left px-3 py-2 hover:bg-white rounded flex items-center gap-2"
                      >
                        <span>☑️</span>
                        <span>Todo</span>
                      </button>
                      <label className="text-left px-3 py-2 hover:bg-white rounded flex items-center gap-2 cursor-pointer">
                        <span>🖼️</span>
                        <span>Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, index)}
                          className="hidden"
                          disabled={loading}
                        />
                      </label>
                      <button
                        onClick={() => setShowInsertMenu(null)}
                        className="text-left px-3 py-2 text-gray-500 hover:bg-white rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : insertingTodo === index ? (
                    <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 my-1">
                      <input
                        type="text"
                        placeholder="Todo text..."
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter' && newTodoText.trim()) {
                            await insertTodo(index)
                          } else if (e.key === 'Escape') {
                            setInsertingTodo(null)
                            setNewTodoText('')
                          }
                        }}
                        autoFocus
                        className="w-full border-0 bg-transparent focus:outline-none text-base"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async () => {
                            if (newTodoText.trim()) {
                              await insertTodo(index)
                            }
                          }}
                          disabled={!newTodoText.trim()}
                          className="px-3 py-1 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setInsertingTodo(null)
                            setNewTodoText('')
                          }}
                          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowInsertMenu(index)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-sm flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 w-full text-left"
                    >
                      <span className="text-lg">+</span>
                      <span>Add block</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Insert menu at end */}
          {showInsertMenu === allBlocks.length && (
            <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 my-1">
              <button
                onClick={() => {
                  setShowInsertMenu(null)
                  insertTextBlock(allBlocks.length)
                }}
                className="text-left px-3 py-2 hover:bg-white rounded flex items-center gap-2"
              >
                <span>📝</span>
                <span>Text</span>
              </button>
              <button
                onClick={() => {
                  setShowInsertMenu(null)
                  setInsertingTodo(allBlocks.length)
                }}
                className="text-left px-3 py-2 hover:bg-white rounded flex items-center gap-2"
              >
                <span>☑️</span>
                <span>Todo</span>
              </button>
              <label className="text-left px-3 py-2 hover:bg-white rounded flex items-center gap-2 cursor-pointer">
                <span>🖼️</span>
                <span>Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, allBlocks.length)}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              <button
                onClick={() => setShowInsertMenu(null)}
                className="text-left px-3 py-2 text-gray-500 hover:bg-white rounded text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Todo input at end */}
          {insertingTodo === allBlocks.length && (
            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 my-1">
              <input
                type="text"
                placeholder="Todo text..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyPress={async (e) => {
                  if (e.key === 'Enter' && newTodoText.trim()) {
                    await insertTodo(allBlocks.length)
                  } else if (e.key === 'Escape') {
                    setInsertingTodo(null)
                    setNewTodoText('')
                  }
                }}
                autoFocus
                className="w-full border-0 bg-transparent focus:outline-none text-base"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={async () => {
                    if (newTodoText.trim()) {
                      await insertTodo(allBlocks.length)
                    }
                  }}
                  disabled={!newTodoText.trim()}
                  className="px-3 py-1 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setInsertingTodo(null)
                    setNewTodoText('')
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {saving && (
        <div className="text-xs text-gray-400 mt-4">Saving...</div>
      )}
    </div>
  )
}
