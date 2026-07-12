// src/modules/profiles/profiles.service.js
const supabase = require('../../config/supabase');

/**
 * Retrieves all user profiles (excluding administrators)
 * @returns {Promise<Array>}
 */
const getAllUserProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, phone, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Deletes a profile by its unique ID
 * @param {string} id - Profile UUID
 * @returns {Promise<object|null>}
 */
const deleteProfile = async (id) => {
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)
    .select('id, full_name, email')
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Retrieves dashboard statistics for a specific user
 * @param {string} userId - User profile UUID
 * @returns {Promise<object>}
 */
const getDashboardStats = async (userId) => {
  const now = new Date();

  // Run database queries in parallel to optimize response time
  const [examsRes, resultsRes, assignmentsRes, submissionsRes, attachmentsRes] = await Promise.all([
    supabase.from('exams').select('id, end_time, status').eq('status', true),
    supabase.from('exam_results').select('exam_id, percentage').eq('user_id', userId),
    supabase.from('assignments').select('id, deadline, max_grade, status').in('status', ['published', 'closed']).is('deleted_at', null),
    supabase.from('assignment_submissions').select('assignment_id, status, grade').eq('user_id', userId),
    supabase.from('attachments').select('id')
  ]);

  if (examsRes.error) throw examsRes.error;
  if (resultsRes.error) throw resultsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (submissionsRes.error) throw submissionsRes.error;
  if (attachmentsRes.error) throw attachmentsRes.error;

  // Process Exams Stats
  const exams = examsRes.data || [];
  const results = resultsRes.data || [];

  const completedExamIds = new Set(results.map(r => r.exam_id));
  const completedExams = completedExamIds.size;

  let availableExams = 0;
  let missedExams = 0;

  exams.forEach(exam => {
    if (!completedExamIds.has(exam.id)) {
      if (!exam.end_time || new Date(exam.end_time) >= now) {
        availableExams++;
      } else {
        missedExams++;
      }
    }
  });

  const totalExams = completedExams + availableExams + missedExams;
  const examCompletionPercentage = totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0;

  let totalExamPercentage = 0;
  let gradedExamsCount = 0;
  results.forEach(r => {
    if (r.percentage !== null && r.percentage !== undefined) {
      totalExamPercentage += parseFloat(r.percentage);
      gradedExamsCount++;
    }
  });
  const examAverage = gradedExamsCount > 0 ? parseFloat((totalExamPercentage / gradedExamsCount).toFixed(2)) : 0;

  // Process Assignments Stats
  const assignments = assignmentsRes.data || [];
  const submissions = submissionsRes.data || [];

  const completedAssignmentIds = new Set(
    submissions
      .filter(s => ['submitted', 'late', 'under_review', 'graded'].includes(s.status))
      .map(s => s.assignment_id)
  );
  const completedAssignments = completedAssignmentIds.size;

  let availableAssignments = 0;
  let missedAssignments = 0;

  const assignmentMap = {};
  assignments.forEach(assign => {
    assignmentMap[assign.id] = assign;
    if (!completedAssignmentIds.has(assign.id)) {
      if (new Date(assign.deadline) >= now) {
        availableAssignments++;
      } else {
        missedAssignments++;
      }
    }
  });

  const totalAssignments = completedAssignments + availableAssignments + missedAssignments;
  const assignmentCompletionPercentage = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  let totalAssignmentPercentage = 0;
  let gradedAssignmentsCount = 0;
  submissions.forEach(sub => {
    if (sub.status === 'graded' && sub.grade !== null && sub.grade !== undefined) {
      const assign = assignmentMap[sub.assignment_id];
      if (assign) {
        const maxGrade = parseFloat(assign.max_grade) || 100.00;
        const percentage = (parseFloat(sub.grade) / maxGrade) * 100;
        totalAssignmentPercentage += percentage;
        gradedAssignmentsCount++;
      }
    }
  });
  const assignmentAverage = gradedAssignmentsCount > 0 ? parseFloat((totalAssignmentPercentage / gradedAssignmentsCount).toFixed(2)) : 0;

  // Process Attachments Stats
  const attachments = attachmentsRes.data || [];
  const totalAttachments = attachments.length;

  return {
    exams: {
      available: availableExams,
      completed: completedExams,
      missed: missedExams,
      completionPercentage: examCompletionPercentage,
      average: examAverage
    },
    assignments: {
      available: availableAssignments,
      completed: completedAssignments,
      missed: missedAssignments,
      completionPercentage: assignmentCompletionPercentage,
      average: assignmentAverage
    },
    attachments: {
      total: totalAttachments
    }
  };
};

module.exports = {
  getAllUserProfiles,
  deleteProfile,
  getDashboardStats
};
