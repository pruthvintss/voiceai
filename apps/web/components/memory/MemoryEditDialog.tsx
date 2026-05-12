'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { Memory, MemoryCategory } from '@/types'

const schema = z.object({
  content: z.string().min(1, 'Content is required').max(2000),
  category: z.enum(['preference', 'fact', 'task', 'relationship', 'business', 'issue', 'pattern', 'other']),
  importance: z.number().min(0).max(1),
  tags: z.string(),
})

type FormData = z.infer<typeof schema>

interface MemoryEditDialogProps {
  memory: Memory | null
  open: boolean
  onClose: () => void
  onSave: (id: string, data: Partial<Memory>) => Promise<void>
  isLoading?: boolean
}

export function MemoryEditDialog({
  memory,
  open,
  onClose,
  onSave,
  isLoading,
}: MemoryEditDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: memory
      ? {
          content: memory.content,
          category: memory.category,
          importance: memory.importance,
          tags: memory.tags.join(', '),
        }
      : undefined,
  })

  React.useEffect(() => {
    if (memory) {
      reset({
        content: memory.content,
        category: memory.category,
        importance: memory.importance,
        tags: memory.tags.join(', '),
      })
    }
  }, [memory, reset])

  const onSubmit = async (data: FormData) => {
    if (!memory) return
    const tags = data.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    await onSave(memory.id, {
      content: data.content,
      category: data.category as MemoryCategory,
      importance: data.importance,
      tags,
    })
    onClose()
  }

  const importanceValue = watch('importance')
  const categoryValue = watch('category')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Memory</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              {...register('content')}
              className="min-h-[100px] resize-none"
              placeholder="Memory content..."
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Category & Importance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={categoryValue}
                onValueChange={(v) => setValue('category', v as MemoryCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['preference', 'fact', 'task', 'relationship', 'business', 'issue', 'pattern', 'other'].map(
                    (cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="importance">
                Importance: {Math.round((importanceValue || 0) * 100)}%
              </Label>
              <input
                id="importance"
                type="range"
                min="0"
                max="1"
                step="0.01"
                {...register('importance', { valueAsNumber: true })}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              {...register('tags')}
              placeholder="work, project, important"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
