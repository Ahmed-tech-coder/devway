// src/modules/assignments/assignments.service.js
const supabase = require('../../config/supabase');
const storageService = require('../../services/storage.service');

// =========================================================================
// ASSIGNMENT TEMPLATES SERVICES
// =========================================================================

const getAllTemplates = async () => {
  const { data, error } = await supabase
    .from('assignment_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const getTemplateById = async (id) => {
  const { data: template, error: templateErr } = await supabase
    .from('assignment_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (templateErr) throw templateErr;
  if (!template) return null;

  const { data: files, error: filesErr } = await supabase
    .from('assignment_template_files')
    .select('*')
    .eq('template_id', id);

  if (filesErr) throw filesErr;

  return {
    ...template,
    files: files || []
  };
};

const createTemplate = async (templateData, files = [], creatorId) => {
  const {
    title, description, instructions, objectives, resources, rubrics,
    allowText, allowFile, allowedExtensions, maxUploadSize, maxAttempts,
    defaultGrade, defaultDurationDays
  } = templateData;

  const { data: template, error } = await supabase
    .from('assignment_templates')
    .insert({
      title,
      description,
      instructions,
      objectives,
      resources: resources ? JSON.parse(resources) : [],
      rubrics: rubrics ? JSON.parse(rubrics) : [],
      allow_text: allowText === 'true' || allowText === true,
      allow_file: allowFile === 'true' || allowFile === true,
      allowed_extensions: allowedExtensions,
      max_upload_size: maxUploadSize ? parseInt(maxUploadSize) : 10,
      max_attempts: maxAttempts ? parseInt(maxAttempts) : 1,
      default_grade: defaultGrade ? parseFloat(defaultGrade) : 100.00,
      default_duration_days: defaultDurationDays ? parseInt(defaultDurationDays) : 7,
      created_by: creatorId
    })
    .select('*')
    .single();

  if (error) throw error;

  // Handle uploaded files
  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await storageService.uploadFile('attachments', file);
      const ext = (file.originalname.split('.').pop() || '').toLowerCase();
      await supabase.from('assignment_template_files').insert({
        template_id: template.id,
        original_name: file.originalname,
        stored_name: uploadResult.path,
        mime_type: file.mimetype,
        extension: ext,
        size: file.size,
        url: uploadResult.publicUrl
      });
    }
  }

  return getTemplateById(template.id);
};

const updateTemplate = async (id, templateData, files = []) => {
  const {
    title, description, instructions, objectives, resources, rubrics,
    allowText, allowFile, allowedExtensions, maxUploadSize, maxAttempts,
    defaultGrade, defaultDurationDays, removeFiles
  } = templateData;

  const { data: template, error } = await supabase
    .from('assignment_templates')
    .update({
      title,
      description,
      instructions,
      objectives,
      resources: resources ? (typeof resources === 'string' ? JSON.parse(resources) : resources) : [],
      rubrics: rubrics ? (typeof rubrics === 'string' ? JSON.parse(rubrics) : rubrics) : [],
      allow_text: allowText === 'true' || allowText === true,
      allow_file: allowFile === 'true' || allowFile === true,
      allowed_extensions: allowedExtensions,
      max_upload_size: maxUploadSize ? parseInt(maxUploadSize) : 10,
      max_attempts: maxAttempts ? parseInt(maxAttempts) : 1,
      default_grade: defaultGrade ? parseFloat(defaultGrade) : 100.00,
      default_duration_days: defaultDurationDays ? parseInt(defaultDurationDays) : 7,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!template) return null;

  // Handle file deletions
  if (removeFiles) {
    const fileIdsToDelete = typeof removeFiles === 'string' ? JSON.parse(removeFiles) : removeFiles;
    for (const fileId of fileIdsToDelete) {
      const { data: dbFile } = await supabase
        .from('assignment_template_files')
        .select('url')
        .eq('id', fileId)
        .maybeSingle();

      if (dbFile) {
        try {
          await storageService.deleteFile('attachments', dbFile.url);
        } catch (e) {
          console.error('Template file clean up error:', e);
        }
        await supabase.from('assignment_template_files').delete().eq('id', fileId);
      }
    }
  }

  // Handle newly uploaded files
  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await storageService.uploadFile('attachments', file);
      const ext = (file.originalname.split('.').pop() || '').toLowerCase();
      await supabase.from('assignment_template_files').insert({
        template_id: id,
        original_name: file.originalname,
        stored_name: uploadResult.path,
        mime_type: file.mimetype,
        extension: ext,
        size: file.size,
        url: uploadResult.publicUrl
      });
    }
  }

  return getTemplateById(id);
};

const deleteTemplate = async (id) => {
  const { data: files } = await supabase
    .from('assignment_template_files')
    .select('url')
    .eq('template_id', id);

  if (files && files.length > 0) {
    for (const file of files) {
      try {
        await storageService.deleteFile('attachments', file.url);
      } catch (e) {
        console.error('Template delete file error:', e);
      }
    }
  }

  const { data, error } = await supabase
    .from('assignment_templates')
    .delete()
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const duplicateTemplate = async (id, creatorId) => {
  const template = await getTemplateById(id);
  if (!template) throw new Error('القالب المطلوب غير موجود');

  const newTemplateData = {
    ...template,
    title: `${template.title} (نسخة)`
  };

  const duplicated = await createTemplate(newTemplateData, [], creatorId);

  // Copy template files
  if (template.files && template.files.length > 0) {
    for (const file of template.files) {
      await supabase.from('assignment_template_files').insert({
        template_id: duplicated.id,
        original_name: file.original_name,
        stored_name: file.stored_name,
        mime_type: file.mime_type,
        extension: file.extension,
        size: file.size,
        url: file.url
      });
    }
  }

  return getTemplateById(duplicated.id);
};

// =========================================================================
// ASSIGNMENTS SERVICES
// =========================================================================

const getAllAssignments = async (role, userId = null) => {
  // Trigger automatic scheduled publisher/closer sync on load
  await runSchedulerSync();

  let query = supabase
    .from('assignments')
    .select(`
      *,
      profiles:created_by (full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (role !== 'admin') {
    // Student sees only published or closed assignments
    query = query
      .in('status', ['published', 'closed'])
      .is('deleted_at', null)
      .or(`publish_date.is.null,publish_date.lte.${new Date().toISOString()}`);
  } else {
    // Admins see all non-deleted
    query = query.is('deleted_at', null);
  }

  const { data: assignments, error } = await query;
  if (error) throw error;

  // Enhance assignments list with submission stats for admin or submission status for user
  const result = [];
  for (const assign of assignments) {
    if (role === 'admin') {
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('status, grade')
        .eq('assignment_id', assign.id);

      const totalSubmitted = subs?.filter(s => s.status !== 'draft').length || 0;
      const totalGraded = subs?.filter(s => s.status === 'graded').length || 0;
      const totalLate = subs?.filter(s => s.status === 'late').length || 0;
      const grades = subs?.filter(s => s.grade !== null).map(s => parseFloat(s.grade)) || [];
      const avgGrade = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : 0;

      result.push({
        ...assign,
        stats: {
          submitted: totalSubmitted,
          graded: totalGraded,
          late: totalLate,
          avgGrade: parseFloat(avgGrade)
        }
      });
    } else {
      // Find user submission
      const { data: userSub } = await supabase
        .from('assignment_submissions')
        .select('id, status, grade')
        .eq('assignment_id', assign.id)
        .eq('user_id', userId)
        .maybeSingle();

      result.push({
        ...assign,
        submission: userSub || null
      });
    }
  }

  return result;
};

const getDeletedAssignments = async () => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const getAssignmentById = async (id, role = 'admin', userId = null) => {
  await runSchedulerSync();

  const { data: assignment, error: assignErr } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (assignErr) throw assignErr;
  if (!assignment) return null;

  // Prevent student from accessing draft/scheduled assignments
  if (role !== 'admin' && !['published', 'closed'].includes(assignment.status)) {
    return null;
  }

  // Get reference files
  const { data: files, error: filesErr } = await supabase
    .from('assignment_files')
    .select('*')
    .eq('assignment_id', id);

  if (filesErr) throw filesErr;

  // Get version history for teachers
  let versions = [];
  if (role === 'admin') {
    const { data: verData } = await supabase
      .from('assignment_versions')
      .select(`
        *,
        profiles:editor_id (full_name)
      `)
      .eq('assignment_id', id)
      .order('created_at', { ascending: false });
    versions = verData || [];
  }

  return {
    ...assignment,
    files: files || [],
    versions,
    rubrics: typeof assignment.rubrics === 'string' ? JSON.parse(assignment.rubrics) : assignment.rubrics,
    resources: typeof assignment.resources === 'string' ? JSON.parse(assignment.resources) : assignment.resources
  };
};

const createAssignment = async (assignmentData, files = [], creatorId) => {
  const {
    title, description, instructions, objectives, resources, rubrics,
    maxGrade, deadline, dueTime, publishDate, allowLateSubmission,
    maxAttempts, allowText, allowFile, allowedExtensions, maxUploadSize,
    status, templateId
  } = assignmentData;

  // Set initial status: if scheduled and publishDate is in future, set to 'scheduled'
  let initialStatus = status || 'draft';
  let resolvedPublishDate = publishDate ? new Date(publishDate) : null;

  if (initialStatus === 'published') {
    if (resolvedPublishDate && resolvedPublishDate > new Date()) {
      resolvedPublishDate = new Date();
    }
  } else if (resolvedPublishDate && resolvedPublishDate > new Date()) {
    initialStatus = 'scheduled';
  }

  const { data: assignment, error } = await supabase
    .from('assignments')
    .insert({
      title,
      description,
      instructions,
      objectives,
      resources: resources ? (typeof resources === 'string' ? JSON.parse(resources) : resources) : [],
      max_grade: parseFloat(maxGrade),
      deadline: new Date(deadline).toISOString(),
      due_time: dueTime,
      publish_date: resolvedPublishDate ? resolvedPublishDate.toISOString() : null,
      allow_late_submission: allowLateSubmission === 'true' || allowLateSubmission === true,
      max_attempts: maxAttempts ? parseInt(maxAttempts) : 1,
      allow_text: allowText === 'true' || allowText === true,
      allow_file: allowFile === 'true' || allowFile === true,
      allowed_extensions: allowedExtensions,
      max_upload_size: maxUploadSize ? parseInt(maxUploadSize) : 10,
      status: initialStatus,
      rubrics: rubrics ? (typeof rubrics === 'string' ? JSON.parse(rubrics) : rubrics) : [],
      created_by: creatorId,
      template_id: templateId ? parseInt(templateId) : null
    })
    .select('*')
    .single();

  if (error) throw error;

  // Handle uploaded files
  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await storageService.uploadFile('attachments', file);
      const ext = (file.originalname.split('.').pop() || '').toLowerCase();
      await supabase.from('assignment_files').insert({
        assignment_id: assignment.id,
        original_name: file.originalname,
        stored_name: uploadResult.path,
        mime_type: file.mimetype,
        extension: ext,
        size: file.size,
        url: uploadResult.publicUrl
      });
    }
  }

  // Trigger publication notifications if immediately published
  if (initialStatus === 'published') {
    await triggerNotificationsForNewAssignment(assignment);
  }

  return getAssignmentById(assignment.id);
};

const updateAssignment = async (id, assignmentData, files = [], editorId) => {
  const current = await getAssignmentById(id, 'admin');
  if (!current) throw new Error('الواجب المطلوب غير موجود للتعديل');

  const {
    title, description, instructions, objectives, resources, rubrics,
    maxGrade, deadline, dueTime, publishDate, allowLateSubmission,
    maxAttempts, allowText, allowFile, allowedExtensions, maxUploadSize,
    status, removeFiles
  } = assignmentData;

  // Track differences to save version history
  const diff = {};
  if (title !== undefined && title !== current.title) diff.title = { old: current.title, new: title };
  if (description !== undefined && description !== current.description) diff.description = { old: current.description, new: description };
  if (instructions !== undefined && instructions !== current.instructions) diff.instructions = { old: current.instructions, new: instructions };
  if (objectives !== undefined && objectives !== current.objectives) diff.objectives = { old: current.objectives, new: objectives };
  if (maxGrade !== undefined && parseFloat(maxGrade) !== parseFloat(current.max_grade)) diff.max_grade = { old: current.max_grade, new: parseFloat(maxGrade) };
  if (deadline !== undefined && new Date(deadline).toISOString() !== new Date(current.deadline).toISOString()) diff.deadline = { old: current.deadline, new: deadline };
  if (dueTime !== undefined && dueTime !== current.due_time) diff.due_time = { old: current.due_time, new: dueTime };

  let nextStatus = status || current.status;
  let resolvedPublishDate = (publishDate !== undefined && publishDate !== null && publishDate !== '') ? new Date(publishDate) : null;

  if (nextStatus === 'published') {
    if (resolvedPublishDate && resolvedPublishDate > new Date()) {
      resolvedPublishDate = new Date();
    }
  } else if (resolvedPublishDate && resolvedPublishDate > new Date()) {
    nextStatus = 'scheduled';
  } else if (resolvedPublishDate && resolvedPublishDate <= new Date() && nextStatus === 'scheduled') {
    nextStatus = 'published';
  }

  const { data: updated, error } = await supabase
    .from('assignments')
    .update({
      title,
      description,
      instructions,
      objectives,
      resources: resources ? (typeof resources === 'string' ? JSON.parse(resources) : resources) : current.resources,
      max_grade: maxGrade ? parseFloat(maxGrade) : current.max_grade,
      deadline: deadline ? new Date(deadline).toISOString() : current.deadline,
      due_time: dueTime !== undefined ? dueTime : current.due_time,
      publish_date: resolvedPublishDate ? resolvedPublishDate.toISOString() : null,
      allow_late_submission: allowLateSubmission !== undefined ? (allowLateSubmission === 'true' || allowLateSubmission === true) : current.allow_late_submission,
      max_attempts: maxAttempts ? parseInt(maxAttempts) : current.max_attempts,
      allow_text: allowText !== undefined ? (allowText === 'true' || allowText === true) : current.allow_text,
      allow_file: allowFile !== undefined ? (allowFile === 'true' || allowFile === true) : current.allow_file,
      allowed_extensions: allowedExtensions !== undefined ? allowedExtensions : current.allowed_extensions,
      max_upload_size: maxUploadSize ? parseInt(maxUploadSize) : current.max_upload_size,
      status: nextStatus,
      rubrics: rubrics ? (typeof rubrics === 'string' ? JSON.parse(rubrics) : rubrics) : current.rubrics,
      version: current.version + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  // Save changes to audit log if differences exist
  if (Object.keys(diff).length > 0) {
    await supabase.from('assignment_versions').insert({
      assignment_id: id,
      version_number: current.version,
      changed_fields: diff,
      editor_id: editorId
    });
  }

  // Handle file deletions
  if (removeFiles) {
    const fileIdsToDelete = typeof removeFiles === 'string' ? JSON.parse(removeFiles) : removeFiles;
    for (const fileId of fileIdsToDelete) {
      const { data: dbFile } = await supabase
        .from('assignment_files')
        .select('url')
        .eq('id', fileId)
        .maybeSingle();

      if (dbFile) {
        try {
          await storageService.deleteFile('attachments', dbFile.url);
        } catch (e) {
          console.error('File cleanup failure:', e);
        }
        await supabase.from('assignment_files').delete().eq('id', fileId);
      }
    }
  }

  // Handle uploaded files
  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await storageService.uploadFile('attachments', file);
      const ext = (file.originalname.split('.').pop() || '').toLowerCase();
      await supabase.from('assignment_files').insert({
        assignment_id: id,
        original_name: file.originalname,
        stored_name: uploadResult.path,
        mime_type: file.mimetype,
        extension: ext,
        size: file.size,
        url: uploadResult.publicUrl
      });
    }
  }

  // Trigger update notifications
  if (nextStatus === 'published') {
    await triggerNotificationsForUpdatedAssignment(updated);
  }

  return getAssignmentById(id);
};

const softDeleteAssignment = async (id) => {
  const { data, error } = await supabase
    .from('assignments')
    .update({
      deleted_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const restoreAssignment = async (id) => {
  const { data, error } = await supabase
    .from('assignments')
    .update({
      deleted_at: null
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const permanentDeleteAssignment = async (id) => {
  // Clean reference files in storage
  const { data: files } = await supabase
    .from('assignment_files')
    .select('url')
    .eq('assignment_id', id);

  if (files && files.length > 0) {
    for (const file of files) {
      try {
        await storageService.deleteFile('attachments', file.url);
      } catch (e) {
        console.error('Permanent delete clean file error:', e);
      }
    }
  }

  // Also clean submission files in storage
  const { data: subs } = await supabase
    .from('assignment_submissions')
    .select('id')
    .eq('assignment_id', id);

  if (subs && subs.length > 0) {
    for (const sub of subs) {
      const { data: attempts } = await supabase
        .from('assignment_submission_attempts')
        .select('id')
        .eq('submission_id', sub.id);

      if (attempts && attempts.length > 0) {
        for (const attempt of attempts) {
          const { data: subFiles } = await supabase
            .from('assignment_submission_files')
            .select('url')
            .eq('attempt_id', attempt.id);
          
          if (subFiles && subFiles.length > 0) {
            for (const sf of subFiles) {
              try {
                await storageService.deleteFile('attachments', sf.url);
              } catch (err) {
                console.error('Submission clean file error:', err);
              }
            }
          }
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

// =========================================================================
// SUBMISSIONS & ATTEMPTS SERVICES
// =========================================================================

const getSubmissionDetails = async (assignmentId, studentId) => {
  const { data: sub, error: subErr } = await supabase
    .from('assignment_submissions')
    .select(`
      *,
      profiles:user_id (full_name, email)
    `)
    .eq('assignment_id', assignmentId)
    .eq('user_id', studentId)
    .maybeSingle();

  if (subErr) throw subErr;
  if (!sub) return null;

  // Fetch attempts history
  const { data: attempts, error: attErr } = await supabase
    .from('assignment_submission_attempts')
    .select('*')
    .eq('submission_id', sub.id)
    .order('attempt_number', { ascending: false });

  if (attErr) throw attErr;

  const enrichedAttempts = [];
  if (attempts && attempts.length > 0) {
    for (const attempt of attempts) {
      const { data: attFiles } = await supabase
        .from('assignment_submission_files')
        .select('*')
        .eq('attempt_id', attempt.id);
      enrichedAttempts.push({
        ...attempt,
        files: attFiles || []
      });
    }
  }

  return {
    ...sub,
    attempts: enrichedAttempts
  };
};

const getSubmissionById = async (submissionId) => {
  const { data: sub, error } = await supabase
    .from('assignment_submissions')
    .select(`
      *,
      profiles:user_id (full_name, email),
      assignments (*)
    `)
    .eq('id', submissionId)
    .maybeSingle();

  if (error) throw error;
  if (!sub) return null;

  const { data: attempts } = await supabase
    .from('assignment_submission_attempts')
    .select('*')
    .eq('submission_id', sub.id)
    .order('attempt_number', { ascending: false });

  const enrichedAttempts = [];
  if (attempts) {
    for (const attempt of attempts) {
      const { data: attFiles } = await supabase
        .from('assignment_submission_files')
        .select('*')
        .eq('attempt_id', attempt.id);
      enrichedAttempts.push({
        ...attempt,
        files: attFiles || []
      });
    }
  }

  return {
    ...sub,
    attempts: enrichedAttempts
  };
};

const getSubmissionsForAssignment = async (assignmentId) => {
  const { data: subs, error } = await supabase
    .from('assignment_submissions')
    .select(`
      id, assignment_id, user_id, status, grade, feedback, graded_at, created_at, updated_at,
      profiles:user_id (full_name, email)
    `)
    .eq('assignment_id', assignmentId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Enrich with latest attempts info
  const enriched = [];
  for (const sub of subs) {
    const details = await getSubmissionDetails(assignmentId, sub.user_id);
    enriched.push(details);
  }

  return enriched;
};

const saveOrSubmitSubmission = async (assignmentId, userId, textAnswer, files = [], isFinalSubmit = false) => {
  const assignment = await getAssignmentById(assignmentId, 'user');
  if (!assignment) throw new Error('الواجب المطلوب غير موجود');

  const now = new Date();
  const deadlineDate = new Date(assignment.deadline);

  // Check deadline locking logic
  if (!assignment.allow_late_submission && now > deadlineDate && isFinalSubmit) {
    throw new Error('الواجب مغلق حالياً. لا يمكنك تقديم إجابة بعد تاريخ الغلق.');
  }

  // 1. Get or Create core submission record
  let { data: sub } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!sub) {
    const { data: newSub, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        user_id: userId,
        status: 'draft'
      })
      .select('*')
      .single();

    if (error) throw error;
    sub = newSub;
  }

  // Check locks for finalized submissions
  if (['graded', 'under_review'].includes(sub.status) && isFinalSubmit) {
    throw new Error('لا يمكن تعديل التسليم بعد نقله للمراجعة أو وضع العلامات.');
  }

  // Get current attempts count
  const { data: attempts } = await supabase
    .from('assignment_submission_attempts')
    .select('attempt_number, status')
    .eq('submission_id', sub.id)
    .order('attempt_number', { ascending: false });

  const latestAttempt = attempts?.[0];
  let attemptNumber = latestAttempt ? latestAttempt.attempt_number : 1;

  // If latest attempt was submitted/late, we increment attempt number for next submission
  if (latestAttempt && latestAttempt.status !== 'draft') {
    attemptNumber = latestAttempt.attempt_number + 1;
  }

  if (isFinalSubmit && attemptNumber > assignment.max_attempts) {
    throw new Error('لقد تجاوزت الحد الأقصى للمحاولات المسموحة لهذا الواجب.');
  }

  // 2. Insert or update the attempt record
  let currentAttemptId = null;
  const isLate = now > deadlineDate;
  const finalStatus = isFinalSubmit ? (isLate ? 'late' : 'submitted') : 'draft';

  // If there's an existing draft attempt, we reuse it. Otherwise, create a new one.
  const { data: existingDraftAttempt } = await supabase
    .from('assignment_submission_attempts')
    .select('id')
    .eq('submission_id', sub.id)
    .eq('attempt_number', attemptNumber)
    .eq('status', 'draft')
    .maybeSingle();

  if (existingDraftAttempt) {
    currentAttemptId = existingDraftAttempt.id;
    const { error: updErr } = await supabase
      .from('assignment_submission_attempts')
      .update({
        text_answer: textAnswer,
        status: finalStatus,
        submitted_at: isFinalSubmit ? now.toISOString() : null
      })
      .eq('id', currentAttemptId);

    if (updErr) throw updErr;
  } else {
    const { data: newAttempt, error: insErr } = await supabase
      .from('assignment_submission_attempts')
      .insert({
        submission_id: sub.id,
        attempt_number: attemptNumber,
        text_answer: textAnswer,
        status: finalStatus,
        submitted_at: isFinalSubmit ? now.toISOString() : null
      })
      .select('id')
      .single();

    if (insErr) throw insErr;
    currentAttemptId = newAttempt.id;
  }

  // 3. Upload student files to this specific attempt
  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await storageService.uploadFile('attachments', file);
      const ext = (file.originalname.split('.').pop() || '').toLowerCase();
      await supabase.from('assignment_submission_files').insert({
        attempt_id: currentAttemptId,
        original_name: file.originalname,
        stored_name: uploadResult.path,
        mime_type: file.mimetype,
        extension: ext,
        size: file.size,
        url: uploadResult.publicUrl
      });
    }
  }

  // Update submission record status
  const { error: subUpdErr } = await supabase
    .from('assignment_submissions')
    .update({
      status: finalStatus,
      updated_at: now.toISOString()
    })
    .eq('id', sub.id);

  if (subUpdErr) throw subUpdErr;

  // Send notifications upon submission
  if (isFinalSubmit) {
    await triggerNotificationsForSubmission(sub, isLate);
  }

  return getSubmissionDetails(assignmentId, userId);
};

const removeSubmissionFile = async (fileId) => {
  const { data: dbFile } = await supabase
    .from('assignment_submission_files')
    .select('url')
    .eq('id', fileId)
    .maybeSingle();

  if (dbFile) {
    try {
      await storageService.deleteFile('attachments', dbFile.url);
    } catch (e) {
      console.error('File cleanup failure:', e);
    }
    await supabase.from('assignment_submission_files').delete().eq('id', fileId);
    return true;
  }
  return false;
};

const updateSubmissionStatus = async (submissionId, status) => {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', submissionId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const gradeSubmission = async (submissionId, gradeData, graderId) => {
  const { grade, feedback } = gradeData;

  const submission = await getSubmissionById(submissionId);
  if (!submission) throw new Error('التسليم غير موجود لوضع العلامات');

  const { data: updatedSub, error } = await supabase
    .from('assignment_submissions')
    .update({
      grade: parseFloat(grade),
      feedback: feedback,
      status: 'graded',
      graded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .select('*')
    .single();

  if (error) throw error;

  // Trigger graded notification
  await createNotification({
    userId: submission.user_id,
    title: 'تم تصحيح الواجب',
    message: `تم تصحيح واجبك: "${submission.assignments?.title}" وحصلت على درجة ${grade}/${submission.assignments?.max_grade}`,
    type: 'assignment_graded',
    referenceId: submission.assignment_id
  });

  return getSubmissionById(submissionId);
};

const returnSubmission = async (submissionId, feedback, graderId) => {
  const submission = await getSubmissionById(submissionId);
  if (!submission) throw new Error('التسليم غير موجود لإرجاعه');

  const { data: updatedSub, error } = await supabase
    .from('assignment_submissions')
    .update({
      feedback: feedback,
      status: 'returned',
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .select('*')
    .single();

  if (error) throw error;

  // Trigger returned notification
  await createNotification({
    userId: submission.user_id,
    title: 'تم إرجاع واجبك للمراجعة',
    message: `تم إرجاع واجبك "${submission.assignments?.title}" من قبل المعلم. يرجى مراجعة الملاحظات.`,
    type: 'submission_returned',
    referenceId: submission.assignment_id
  });

  return getSubmissionById(submissionId);
};

// =========================================================================
// THREADED DISCUSSION COMMENTS SERVICES
// =========================================================================

const getSubmissionComments = async (submissionId) => {
  const { data, error } = await supabase
    .from('assignment_comments')
    .select(`
      *,
      profiles:user_id (full_name, email, role)
    `)
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

const createComment = async (submissionId, userId, text, parentCommentId = null) => {
  const { data: comment, error } = await supabase
    .from('assignment_comments')
    .insert({
      submission_id: submissionId,
      user_id: userId,
      text: text,
      parent_comment_id: parentCommentId
    })
    .select(`
      *,
      profiles:user_id (full_name, email, role)
    `)
    .single();

  if (error) throw error;

  // Notify other party
  const submission = await getSubmissionById(submissionId);
  if (submission) {
    const isTeacher = comment.profiles?.role === 'admin';
    const notifyTargetUserId = isTeacher ? submission.user_id : submission.assignments?.created_by;
    
    if (notifyTargetUserId && notifyTargetUserId !== userId) {
      await createNotification({
        userId: notifyTargetUserId,
        title: 'تعليق جديد على الواجب',
        message: `تمت إضافة تعليق جديد على تسليم الواجب: "${submission.assignments?.title}"`,
        type: 'comment_created',
        referenceId: submission.assignment_id
      });
    }
  }

  return comment;
};

// =========================================================================
// STATS & DASHBOARD SERVICES
// =========================================================================

const getDashboardStats = async (role, userId = null) => {
  await runSchedulerSync();

  if (role === 'admin') {
    const { data: all } = await supabase.from('assignments').select('status').is('deleted_at', null);
    const { data: subs } = await supabase.from('assignment_submissions').select('status, grade');
    const { data: profiles } = await supabase.from('profiles').select('id').eq('role', 'user');

    const total = all?.length || 0;
    const drafts = all?.filter(a => a.status === 'draft').length || 0;
    const scheduled = all?.filter(a => a.status === 'scheduled').length || 0;
    const published = all?.filter(a => a.status === 'published').length || 0;
    const closed = all?.filter(a => a.status === 'closed').length || 0;
    const archived = all?.filter(a => a.status === 'archived').length || 0;

    const submitted = subs?.filter(s => s.status !== 'draft').length || 0;
    const graded = subs?.filter(s => s.status === 'graded').length || 0;
    const late = subs?.filter(s => s.status === 'late').length || 0;

    const grades = subs?.filter(s => s.grade !== null).map(s => parseFloat(s.grade)) || [];
    const avgGrade = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : 0;

    return {
      totalAssignments: total,
      draftAssignments: drafts,
      scheduledAssignments: scheduled,
      publishedAssignments: published,
      closedAssignments: closed,
      archivedAssignments: archived,
      totalStudents: profiles?.length || 0,
      totalSubmitted: submitted,
      totalGraded: graded,
      totalLate: late,
      avgGrade: parseFloat(avgGrade)
    };
  } else {
    // Student Dashboard Stats
    const { data: allPub } = await supabase
      .from('assignments')
      .select('id, deadline, max_grade')
      .in('status', ['published', 'closed'])
      .is('deleted_at', null);

    const { data: userSubs } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, status, grade')
      .eq('user_id', userId);

    const subMap = new Map();
    userSubs?.forEach(s => subMap.set(s.assignment_id, s));

    let upcoming = 0;
    let missing = 0;
    let submitted = 0;
    let drafts = 0;
    let graded = 0;

    const grades = [];
    const now = new Date();

    allPub?.forEach(assign => {
      const sub = subMap.get(assign.id);
      const dl = new Date(assign.deadline);

      if (!sub) {
        if (now > dl) {
          missing++;
        } else {
          upcoming++;
        }
      } else {
        if (sub.status === 'draft') {
          drafts++;
          if (now > dl) {
            missing++;
          } else {
            upcoming++;
          }
        } else if (sub.status === 'graded') {
          graded++;
          submitted++;
          if (sub.grade !== null) {
            // Normalize percentage or grade
            grades.push((parseFloat(sub.grade) / parseFloat(assign.max_grade)) * 100);
          }
        } else {
          submitted++;
        }
      }
    });

    const avgPercentage = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : 0;

    return {
      upcomingAssignments: upcoming,
      missingAssignments: missing,
      submittedAssignments: submitted,
      draftAssignments: drafts,
      gradedAssignments: graded,
      avgGradePercentage: parseFloat(avgPercentage)
    };
  }
};

// =========================================================================
// NOTIFICATIONS SERVICES
// =========================================================================

const createNotification = async (notifData) => {
  const { userId, title, message, type, referenceId } = notifData;
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      reference_id: referenceId
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const getUserNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const markNotificationsAsRead = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .select('*');

  if (error) throw error;
  return data || [];
};

// =========================================================================
// SCHEDULER & AUTO SYNC SERVICES
// =========================================================================

const runSchedulerSync = async () => {
  const now = new Date().toISOString();

  // 1. Scheduled -> Published
  const { data: schedData } = await supabase
    .from('assignments')
    .select('id, title')
    .eq('status', 'scheduled')
    .lte('publish_date', now);

  if (schedData && schedData.length > 0) {
    for (const item of schedData) {
      await supabase
        .from('assignments')
        .update({ status: 'published' })
        .eq('id', item.id);
      
      const { data: updatedItem } = await supabase.from('assignments').select('*').eq('id', item.id).single();
      await triggerNotificationsForNewAssignment(updatedItem);
    }
  }

  // 2. Published -> Closed (when deadline passed and late submissions disabled)
  const { data: pubData } = await supabase
    .from('assignments')
    .select('id')
    .eq('status', 'published')
    .eq('allow_late_submission', false)
    .lte('deadline', now);

  if (pubData && pubData.length > 0) {
    for (const item of pubData) {
      await supabase
        .from('assignments')
        .update({ status: 'closed' })
        .eq('id', item.id);
    }
  }
};

// =========================================================================
// NOTIFICATION TRIGGER UTILITIES
// =========================================================================

const triggerNotificationsForNewAssignment = async (assignment) => {
  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'user');

  if (students && students.length > 0) {
    for (const st of students) {
      await createNotification({
        userId: st.id,
        title: 'واجب دراسي جديد',
        message: `تم نشر واجب جديد: "${assignment.title}". الموعد النهائي للتسليم: ${new Date(assignment.deadline).toLocaleString('ar-EG')}`,
        type: 'assignment_published',
        referenceId: assignment.id
      });
    }
  }
};

const triggerNotificationsForUpdatedAssignment = async (assignment) => {
  const { data: students } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'user');

  if (students && students.length > 0) {
    for (const st of students) {
      await createNotification({
        userId: st.id,
        title: 'تم تحديث الواجب الدراسي',
        message: `تم إجراء تعديلات على الواجب الدراسي: "${assignment.title}"`,
        type: 'assignment_updated',
        referenceId: assignment.id
      });
    }
  }
};

const triggerNotificationsForSubmission = async (submission, isLate) => {
  // Find teachers / admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: isLate ? 'تسليم متأخر للواجب' : 'تم تسليم واجب جديد',
        message: `تم استلام تسليم ${isLate ? 'متأخر' : ''} للواجب من قبل الطالب.`,
        type: 'submission_received',
        referenceId: submission.assignment_id
      });
    }
  }
};

module.exports = {
  // Templates
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,

  // Assignments
  getAllAssignments,
  getDeletedAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  softDeleteAssignment,
  restoreAssignment,
  permanentDeleteAssignment,

  // Submissions
  getSubmissionDetails,
  getSubmissionById,
  getSubmissionsForAssignment,
  saveOrSubmitSubmission,
  removeSubmissionFile,
  updateSubmissionStatus,
  gradeSubmission,
  returnSubmission,

  // Comments
  getSubmissionComments,
  createComment,

  // Stats
  getDashboardStats,

  // Notifications
  createNotification,
  getUserNotifications,
  markNotificationsAsRead,

  // Scheduler
  runSchedulerSync
};
