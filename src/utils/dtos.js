// src/utils/dtos.js

/**
 * Map a single assignment to DTO, hiding internal database details
 */
const mapAssignmentToDTO = (a) => {
  if (!a) return null;
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    max_grade: a.max_grade,
    deadline: a.deadline,
    allow_late_submission: a.allow_late_submission,
    max_attempts: a.max_attempts,
    allow_text: a.allow_text,
    allow_file: a.allow_file,
    allowed_extensions: a.allowed_extensions,
    max_upload_size: a.max_upload_size,
    status: a.status,
    created_at: a.created_at,
    updated_at: a.updated_at,
    submission: a.submission || null,
    submissions_count: a.submissions_count,
    average_grade: a.average_grade
  };
};

/**
 * Map a single assignment's full details (with instructions, objectives, resources, rubrics, files) to DTO
 */
const mapAssignmentDetailsToDTO = (a) => {
  if (!a) return null;
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    instructions: a.instructions,
    objectives: a.objectives,
    resources: Array.isArray(a.resources) ? a.resources : [],
    max_grade: a.max_grade,
    deadline: a.deadline,
    allow_late_submission: a.allow_late_submission,
    max_attempts: a.max_attempts,
    allow_text: a.allow_text,
    allow_file: a.allow_file,
    allowed_extensions: a.allowed_extensions,
    max_upload_size: a.max_upload_size,
    status: a.status,
    rubrics: Array.isArray(a.rubrics) ? a.rubrics : [],
    created_at: a.created_at,
    updated_at: a.updated_at,
    files: Array.isArray(a.files) ? a.files.map(f => ({
      id: f.id,
      original_name: f.original_name,
      size: f.size,
      url: f.url,
      extension: f.extension,
      file_type: f.file_type || 'document'
    })) : [],
    submission: a.submission || null,
    submissions: a.submissions || null
  };
};

/**
 * Map a single exam to DTO
 */
const mapExamToDTO = (e) => {
  if (!e) return null;
  return {
    id: e.id,
    title: e.title,
    duration: e.duration,
    mark_per_question: e.mark_per_question,
    start_time: e.start_time,
    end_time: e.end_time,
    status: e.status,
    created_at: e.created_at,
    score: e.score !== undefined ? e.score : null,
    percentage: e.percentage !== undefined ? e.percentage : null,
    submitted_at: e.submitted_at !== undefined ? e.submitted_at : null
  };
};

/**
 * Map a single exam's full details to DTO
 */
const mapExamDetailsToDTO = (e) => {
  if (!e) return null;
  return {
    id: e.id,
    title: e.title,
    duration: e.duration,
    mark_per_question: e.mark_per_question,
    start_time: e.start_time,
    end_time: e.end_time,
    status: e.status,
    created_at: e.created_at,
    exam_results: e.exam_results || []
  };
};

/**
 * Map a user profile to DTO
 */
const mapProfileToDTO = (p) => {
  if (!p) return null;
  return {
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role,
    phone: p.phone,
    created_at: p.created_at
  };
};

module.exports = {
  mapAssignmentToDTO,
  mapAssignmentDetailsToDTO,
  mapExamToDTO,
  mapExamDetailsToDTO,
  mapProfileToDTO
};
