import { useState, useEffect } from 'react'
import { Plus, Link2, Edit2, Trash2, Copy, ToggleLeft, ToggleRight, Zap, Clock, MapPin } from 'lucide-react'
import { eventTypesApi } from '@/services/api'
import { Modal, ConfirmDialog, EmptyState, PageHeader, Spinner, DurationBadge } from '@/components/ui'
import { slugify, COLOR_PRESETS, DURATION_OPTIONS, durationLabel } from '@/lib/utils'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const DEFAULT_FORM = {
  name: '', slug: '', description: '', duration_minutes: 30,
  color: '#0069ff', location: '', buffer_before_minutes: 0,
  buffer_after_minutes: 0, is_active: true,
}

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchEventTypes() }, [])

  async function fetchEventTypes() {
    try {
      const data = await eventTypesApi.list()
      setEventTypes(data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(DEFAULT_FORM)
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(et) {
    setForm({ ...et })
    setEditingId(et.id)
    setModalOpen(true)
  }

  function handleNameChange(name) {
    setForm(f => ({
      ...f,
      name,
      ...(editingId ? {} : { slug: slugify(name) }),
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.slug.trim()) return toast.error('Slug is required')
    setSaving(true)
    try {
      if (editingId) {
        const updated = await eventTypesApi.update(editingId, form)
        setEventTypes(ev => ev.map(e => e.id === editingId ? updated : e))
        toast.success('Event type updated!')
      } else {
        const created = await eventTypesApi.create(form)
        setEventTypes(ev => [...ev, created])
        toast.success('Event type created!')
      }
      setModalOpen(false)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await eventTypesApi.delete(deleteId)
      setEventTypes(ev => ev.filter(e => e.id !== deleteId))
      toast.success('Event type deleted')
      setDeleteId(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActive(et) {
    try {
      const updated = await eventTypesApi.update(et.id, { is_active: !et.is_active })
      setEventTypes(ev => ev.map(e => e.id === et.id ? updated : e))
    } catch (e) {
      toast.error(e.message)
    }
  }

  function copyLink(et) {
    const url = `${window.location.origin}/alex/${et.slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Event Types"
        subtitle="Create events to let people book time with you"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Event Type
          </button>
        }
      />

      {eventTypes.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No event types yet"
          description="Create your first event type to start accepting bookings."
          action={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Create event type</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {eventTypes.map(et => (
            <EventTypeCard
              key={et.id}
              et={et}
              onEdit={() => openEdit(et)}
              onDelete={() => setDeleteId(et.id)}
              onCopy={() => copyLink(et)}
              onToggle={() => toggleActive(et)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Event Type' : 'New Event Type'}
        size="lg"
      >
        <EventTypeForm
          form={form}
          setForm={setForm}
          onNameChange={handleNameChange}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
          saving={saving}
          isEdit={!!editingId}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Event Type"
        message="This will permanently delete this event type and all its associated meetings. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </>
  )
}

function EventTypeCard({ et, onEdit, onDelete, onCopy, onToggle }) {
  return (
    <div className={clsx('card p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-md', !et.is_active && 'opacity-60')}>
      {/* Color bar + title */}
      <div className="flex items-start gap-3">
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: et.color, minHeight: 40 }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{et.name}</h3>
          {et.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{et.description}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2">
        <DurationBadge minutes={et.duration_minutes} />
        {et.location && (
          <span className="badge-gray">
            <MapPin size={10} /> {et.location}
          </span>
        )}
        {(et.buffer_before_minutes > 0 || et.buffer_after_minutes > 0) && (
          <span className="badge-gray">
            Buffer {et.buffer_before_minutes}/{et.buffer_after_minutes}m
          </span>
        )}
      </div>

      {/* Link */}
      <button
        onClick={onCopy}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-xs text-gray-600 font-medium w-full"
      >
        <Link2 size={13} className="text-[#0069ff]" />
        <span className="truncate">schedulr.app/alex/{et.slug}</span>
        <Copy size={12} className="ml-auto flex-shrink-0" />
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
        <button
          onClick={onEdit}
          className="btn-ghost flex-1 text-xs py-1.5"
        >
          <Edit2 size={13} /> Edit
        </button>
        <button
          onClick={onCopy}
          className="btn-ghost flex-1 text-xs py-1.5"
        >
          <Copy size={13} /> Copy link
        </button>
        <button
          onClick={onToggle}
          className="btn-ghost px-2 py-1.5 text-xs"
          title={et.is_active ? 'Deactivate' : 'Activate'}
        >
          {et.is_active
            ? <ToggleRight size={18} className="text-[#0069ff]" />
            : <ToggleLeft size={18} className="text-gray-400" />
          }
        </button>
        <button
          onClick={onDelete}
          className="btn-ghost px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function EventTypeForm({ form, setForm, onNameChange, onSave, onCancel, saving, isEdit }) {
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const setNum = (key) => (e) => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Event name *</label>
          <input
            className="input"
            placeholder="e.g. 30 Min Meeting"
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="label">URL slug *</label>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0069ff]">
            <span className="px-3 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 h-full flex items-center py-2.5">/alex/</span>
            <input
              className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              placeholder="30-min-meeting"
              value={form.slug}
              onChange={set('slug')}
            />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="label">Duration</label>
          <select className="input" value={form.duration_minutes} onChange={setNum('duration_minutes')}>
            {DURATION_OPTIONS.map(d => (
              <option key={d} value={d}>{durationLabel(d)}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Briefly describe this meeting..."
            value={form.description || ''}
            onChange={set('description')}
          />
        </div>

        <div>
          <label className="label">Location / Meeting link</label>
          <input
            className="input"
            placeholder="Zoom, Google Meet, Phone..."
            value={form.location || ''}
            onChange={set('location')}
          />
        </div>

        <div>
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className={clsx(
                  'w-7 h-7 rounded-full border-2 transition-all',
                  form.color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Buffer before (min)</label>
          <input
            type="number"
            className="input"
            min={0}
            max={60}
            value={form.buffer_before_minutes}
            onChange={setNum('buffer_before_minutes')}
          />
        </div>

        <div>
          <label className="label">Buffer after (min)</label>
          <input
            type="number"
            className="input"
            min={0}
            max={60}
            value={form.buffer_after_minutes}
            onChange={setNum('buffer_after_minutes')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? <Spinner size={16} className="text-white" /> : null}
          {isEdit ? 'Save changes' : 'Create event type'}
        </button>
      </div>
    </div>
  )
}
