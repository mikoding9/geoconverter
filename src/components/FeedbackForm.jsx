import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowPathIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Field, Label } from '@/components/fieldset'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { Toast } from '@/components/Toast'
import clsx from 'clsx'

export function FeedbackForm({ className = '' }) {
  const [feedbackName, setFeedbackName] = useState('')
  const [feedbackEmail, setFeedbackEmail] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackAttachment, setFeedbackAttachment] = useState(null)
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false)
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' })

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()

    try {
      setIsFeedbackSubmitting(true)

      let attachmentId = null

      // Upload file if attachment exists
      if (feedbackAttachment) {
        const formData = new FormData()
        formData.append('folder', '7980bcdc-f128-4f45-983c-28b7547d41cf')
        formData.append('file', feedbackAttachment)

        const uploadResponse = await fetch('https://panel.braga.co.id/panel/files', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer 7glXfn7v8FsZ4JHnmk7-6eQk-jvT9Ntk'
          },
          body: formData
        })

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload attachment: ${uploadResponse.statusText}`)
        }

        const uploadData = await uploadResponse.json()
        attachmentId = uploadData.data.id
      }

      // Submit feedback with optional attachment
      const response = await fetch('https://panel.braga.co.id/panel/items/project_feedbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 7glXfn7v8FsZ4JHnmk7-6eQk-jvT9Ntk'
        },
        body: JSON.stringify({
          name: feedbackName || 'Anonymous',
          email: feedbackEmail || null,
          feedback: feedbackMessage,
          project: 'geoconverter',
          attachment: attachmentId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`)
      }

      setToast({
        isOpen: true,
        message: 'Thank you for your feedback! We appreciate your input.',
        type: 'success'
      })

      // Reset form
      setFeedbackName('')
      setFeedbackEmail('')
      setFeedbackMessage('')
      setFeedbackAttachment(null)
      // Reset file input
      const fileInput = document.getElementById('feedback-file-upload')
      if (fileInput) fileInput.value = ''
    } catch (error) {
      console.error('Feedback submission error:', error)
      setToast({
        isOpen: true,
        message: 'Failed to submit feedback. Please try again later.',
        type: 'error'
      })
    } finally {
      setIsFeedbackSubmitting(false)
    }
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className={clsx(className)}
    >
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-xl p-4 sticky top-24 shadow-2xl">
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Send Feedback</h3>
        <form onSubmit={handleFeedbackSubmit} className="space-y-4">

          <Field>
            <Label className="text-xs">Message</Label>
            <Textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Tell us what you think! Bug reports, feature requests, or general feedback..."
              required
              rows={6}
              className="text-sm resize-none"
            />
          </Field>

          <button
            type="button"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
            aria-expanded={showOptionalFields}
          >
            <span>{showOptionalFields ? '▼' : '▶'}</span>
            <span>Optional details</span>
          </button>

          {showOptionalFields && (
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 border border-zinc-800 rounded-xl bg-zinc-800/40 px-4 py-4 backdrop-blur-sm"
              >
                <Field>
                  <Label className="text-xs">Attachment</Label>
                  <div className="relative mt-2">
                    <input
                      type="file"
                      id="feedback-file-upload"
                      onChange={(e) => setFeedbackAttachment(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="feedback-file-upload"
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors text-xs',
                        feedbackAttachment
                          ? 'border-emerald-500/50 bg-emerald-500/5 text-zinc-300'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600'
                      )}
                    >
                      <DocumentArrowUpIcon className="w-4 h-4" />
                      <span className="flex-1 truncate">
                        {feedbackAttachment ? feedbackAttachment.name : 'Attach file'}
                      </span>
                      {feedbackAttachment && (
                        <span className="text-xs text-zinc-500">
                          {(feedbackAttachment.size / 1024).toFixed(1)}KB
                        </span>
                      )}
                    </label>
                  </div>
                  <Text className="text-xs text-zinc-500 mt-1">
                    Screenshots, logs, or sample files (max 10MB)
                  </Text>
                </Field>

                <Field>
                  <Label className="text-xs">Name</Label>
                  <Input
                    type="text"
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    placeholder="Your name"
                    className="text-sm"
                  />
                </Field>

                <Field>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="text-sm"
                  />
                </Field>
              </motion.div>
            </div>
          )}

          <Button
            type="submit"
            color="zinc"
            className="w-full text-sm"
            disabled={!feedbackMessage.trim() || isFeedbackSubmitting}
          >
            {isFeedbackSubmitting ? (
              <>
                <ArrowPathIcon data-slot="icon" className="animate-spin w-4 h-4" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Feedback</span>
            )}
          </Button>

          <Text className="text-xs text-zinc-500 text-center">
            💚 Your feedback helps improve GeoConverter
          </Text>
        </form>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </motion.aside>
  )
}
