<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import { authClient } from "../lib/auth-client";
  import StyledSelect from "../components/StyledSelect.svelte";
  import {
    addTeacherSubject,
    createAssignment,
    getAssignmentSubmissions,
    getFaculties,
    getMySubjects,
    getStudentProfile,
    getSubjects,
    getTeacherSubjects,
    submitAssignment,
    type Assignment,
    type AssignmentSubmission,
    type Faculty,
    type Subject,
  } from "../lib/api";

  const session = authClient.useSession();
  const sessionUser = $derived(
    $session.data?.user as { role?: string } | undefined,
  );
  const isTeacher = $derived(sessionUser?.role === "teacher");
  const isAdmin = $derived(sessionUser?.role === "admin");
  const isStudent = $derived(!isTeacher && !isAdmin);

  const facultiesQuery = createQuery(() => ({
    queryKey: ["classroom-faculties"],
    queryFn: getFaculties,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  }));

  const profileQuery = createQuery(() => ({
    queryKey: ["classroom-profile", $session.data?.user?.id],
    queryFn: getStudentProfile,
    enabled: !!$session.data?.user?.id && isStudent,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  }));

  const mySubjectsQuery = createQuery(() => ({
    queryKey: ["classroom-subjects", $session.data?.user?.id],
    queryFn: getMySubjects,
    enabled: !!$session.data?.user?.id && isStudent,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  }));

  const teacherSubjectsQuery = createQuery(() => ({
    queryKey: ["classroom-teacher-subjects", $session.data?.user?.id],
    queryFn: getTeacherSubjects,
    enabled: !!$session.data?.user?.id && isTeacher,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  }));

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return "No due date";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getSemesterProgress() {
    const profile = profileQuery.data?.profile;
    if (!profile?.semesterStartDate || !profile?.semesterEndDate) return 0;
    const start = new Date(profile.semesterStartDate).getTime();
    const end = new Date(profile.semesterEndDate).getTime();
    if (!start || !end || end <= start) return 0;
    const now = Date.now();
    const progress = ((now - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  const semesterProgress = $derived(getSemesterProgress());
  let activeSubmissionId = $state<number | null>(null);
  let submissionFile = $state<File | null>(null);
  let submissionComment = $state("");
  let submissionError = $state<string | null>(null);
  let submissionLoading = $state(false);

  function openSubmission(assignmentId: number) {
    activeSubmissionId = assignmentId;
    submissionFile = null;
    submissionComment = "";
    submissionError = null;
  }

  async function handleSubmit(assignment: Assignment) {
    if (!submissionFile) {
      submissionError = "Please upload an image or PDF file.";
      return;
    }
    submissionError = null;
    submissionLoading = true;
    try {
      const result = await submitAssignment(
        assignment.id,
        submissionFile,
        submissionComment,
      );
      if (!result.success) {
        submissionError = result.message || "Submission failed.";
      } else {
        activeSubmissionId = null;
        await mySubjectsQuery.refetch();
      }
    } catch (error: any) {
      submissionError = error.message;
    } finally {
      submissionLoading = false;
    }
  }
  let teacherAssign = $state({
    facultyId: "",
    semester: "1",
    subjectId: "",
  });
  let availableSubjects = $state<Subject[]>([]);
  let assignError = $state<string | null>(null);
  let assignLoading = $state(false);

  $effect(() => {
    const facultyId = Number(teacherAssign.facultyId);
    const semester = Number(teacherAssign.semester);
    if (!facultyId) {
      availableSubjects = [];
      teacherAssign.subjectId = "";
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await getSubjects(facultyId, semester);
      if (cancelled) return;
      if (result.success) {
        availableSubjects = result.subjects;
        teacherAssign.subjectId = result.subjects[0]
          ? String(result.subjects[0].id)
          : "";
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  async function handleAddSubject() {
    assignError = null;
    assignLoading = true;
    try {
      const result = await addTeacherSubject(Number(teacherAssign.subjectId));
      if (!result.success) {
        assignError = result.message || "Failed to add subject.";
      } else {
        await teacherSubjectsQuery.refetch();
      }
    } catch (error: any) {
      assignError = error.message;
    } finally {
      assignLoading = false;
    }
  }
  let assignmentForm = $state({
    subjectId: "",
    title: "",
    description: "",
    type: "classwork" as "classwork" | "homework",
    dueAt: "",
  });
  let assignmentError = $state<string | null>(null);
  let assignmentLoading = $state(false);

  $effect(() => {
    const subjects = teacherSubjectsQuery.data?.subjects || [];
    if (!assignmentForm.subjectId && subjects.length > 0) {
      assignmentForm.subjectId = String(subjects[0].id);
    }
  });

  async function handleCreateAssignment() {
    assignmentError = null;
    assignmentLoading = true;
    try {
      const result = await createAssignment({
        subjectId: Number(assignmentForm.subjectId),
        title: assignmentForm.title,
        description: assignmentForm.description,
        type: assignmentForm.type,
        dueAt: assignmentForm.dueAt || undefined,
      });

      if (!result.success) {
        assignmentError = result.message || "Failed to create assignment.";
      } else {
        assignmentForm.title = "";
        assignmentForm.description = "";
        assignmentForm.dueAt = "";
        await teacherSubjectsQuery.refetch();
        await mySubjectsQuery.refetch();
      }
    } catch (error: any) {
      assignmentError = error.message;
    } finally {
      assignmentLoading = false;
    }
  }

  let submissionsByAssignment = $state<Record<number, AssignmentSubmission[]>>(
    {},
  );
  let submissionsLoading = $state<Record<number, boolean>>({});

  async function toggleSubmissions(assignmentId: number) {
    if (submissionsByAssignment[assignmentId]) {
      const updated = { ...submissionsByAssignment };
      delete updated[assignmentId];
      submissionsByAssignment = updated;
      return;
    }

    submissionsLoading = { ...submissionsLoading, [assignmentId]: true };
    const result = await getAssignmentSubmissions(assignmentId);
    submissionsLoading = { ...submissionsLoading, [assignmentId]: false };
    if (result.success) {
      submissionsByAssignment = {
        ...submissionsByAssignment,
        [assignmentId]: result.submissions,
      };
    }
  }
  const studentSummary = $derived.by(() => {
    const subjects = mySubjectsQuery.data?.subjects || [];
    const assignments = subjects.flatMap(
      (subject) => subject.assignments || [],
    );
    const now = Date.now();
    const submittedCount = assignments.filter(
      (assignment) => assignment.submission,
    ).length;
    const pendingCount = assignments.filter(
      (assignment) => !assignment.submission,
    ).length;
    const overdueCount = assignments.filter(
      (assignment) =>
        !assignment.submission &&
        assignment.dueAt &&
        new Date(assignment.dueAt).getTime() < now,
    ).length;
    return {
      subjectCount: subjects.length,
      assignmentCount: assignments.length,
      submittedCount,
      pendingCount,
      overdueCount,
    };
  });

  const teacherSummary = $derived.by(() => {
    const subjects = teacherSubjectsQuery.data?.subjects || [];
    const assignments = subjects.flatMap(
      (subject) => subject.assignments || [],
    );
    const classworkCount = assignments.filter(
      (assignment) => assignment.type === "classwork",
    ).length;
    const homeworkCount = assignments.filter(
      (assignment) => assignment.type === "homework",
    ).length;
    return {
      subjectCount: subjects.length,
      assignmentCount: assignments.length,
      classworkCount,
      homeworkCount,
    };
  });

  // Student Dashboard Logic
  let studentView = $state<"todo" | "done" | "subjects">("todo");
  
  const studentAssignments = $derived.by(() => {
    const subjects = mySubjectsQuery.data?.subjects || [];
    const all = subjects.flatMap(subject => 
      (subject.assignments || []).map(a => ({...a, subjectTitle: subject.title, subjectCode: subject.code}))
    );
    
    // Sort by due date (nearest first), then null due dates
    return all.sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  });

  const todoAssignments = $derived(studentAssignments.filter(a => !a.submission));
  const doneAssignments = $derived(studentAssignments.filter(a => !!a.submission));

  function getStatusColor(assignment: any) {
    if (assignment.submission) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (!assignment.dueAt) return "bg-slate-100 text-slate-700 border-slate-200";
    
    const now = new Date();
    const due = new Date(assignment.dueAt);
    
    if (due < now) return "bg-rose-100 text-rose-700 border-rose-200"; // Overdue
    
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return "bg-amber-100 text-amber-700 border-amber-200"; // Due soon (24h)
    
    return "bg-blue-50 text-blue-700 border-blue-200"; // Regular
  }
  
  function getStatusText(assignment: any) {
    if (assignment.submission) return "Submitted";
    if (!assignment.dueAt) return "No Due Date";
    
    const now = new Date();
    const due = new Date(assignment.dueAt);
    
    if (due < now) return "Overdue";
    
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return "Due Soon";
    
    return "Upcoming";
  }

</script>

<div
  class="min-h-[calc(100vh-4rem)] bg-slate-50/50 px-4 py-8 sm:px-6 lg:px-8"
>
  <div class="max-w-7xl mx-auto space-y-8">
    {#if $session.isPending}
      <div class="flex items-center justify-center py-24">
        <div
          class="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"
        ></div>
      </div>
    {:else if !$session.data?.user}
      <div
        class="rounded-2xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm"
      >
        <h2 class="text-xl font-semibold text-slate-900 mb-2">
          Sign in to access Classroom
        </h2>
        <p class="text-slate-500 mb-6">
          Classroom keeps your semester subjects and assignments organized.
        </p>
        <a
          href="/register"
          class="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >Sign In</a
        >
      </div>
    {:else}
      <!-- Dashboard Header -->
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
              {isTeacher ? "Teacher Workspace" : isAdmin ? "Admin Overview" : "Student Workspace"}
            </h1>
            <p class="text-slate-500 mt-1">
              {isTeacher ? "Manage your subjects and assignments." : isAdmin ? "System overview." : `Track your semester progress and tasks.`}
            </p>
          </div>
          
          {#if isStudent && profileQuery.data?.profile}
             <div class="hidden sm:block text-right">
                <p class="text-sm font-medium text-slate-900">{profileQuery.data.profile.faculty?.name || "Faculty"}</p>
                <p class="text-xs text-slate-500">Semester {profileQuery.data.profile.currentSemester}</p>
             </div>
          {/if}
        </div>

        {#if !isAdmin}
          <!-- Stats Grid -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {#if isTeacher}
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p class="text-xs font-medium uppercase text-slate-400 mb-1">Total Subjects</p>
                <p class="text-2xl font-bold text-slate-900">{teacherSummary.subjectCount}</p>
              </div>
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p class="text-xs font-medium uppercase text-slate-400 mb-1">Active Assignments</p>
                <p class="text-2xl font-bold text-slate-900">{teacherSummary.assignmentCount}</p>
              </div>
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p class="text-xs font-medium uppercase text-slate-400 mb-1">Classwork</p>
                <p class="text-2xl font-bold text-slate-900">{teacherSummary.classworkCount}</p>
              </div>
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p class="text-xs font-medium uppercase text-slate-400 mb-1">Homework</p>
                <p class="text-2xl font-bold text-slate-900">{teacherSummary.homeworkCount}</p>
              </div>
            {:else}
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p class="text-xs font-medium uppercase text-slate-400 mb-1">To Do</p>
                <p class="text-2xl font-bold text-slate-900">{studentSummary.pendingCount}</p>
              </div>
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p class="text-xs font-medium uppercase text-slate-400 mb-1">Overdue</p>
                <div class="flex items-baseline gap-2">
                  <p class="text-2xl font-bold text-rose-600">{studentSummary.overdueCount}</p>
                  {#if studentSummary.overdueCount > 0}
                    <span class="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Action needed</span>
                  {/if}
                </div>
              </div>
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p class="text-xs font-medium uppercase text-slate-400 mb-1">Submitted</p>
                <p class="text-2xl font-bold text-slate-900">{studentSummary.submittedCount}</p>
              </div>
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <p class="text-xs font-medium uppercase text-slate-400 mb-1">Semester Progress</p>
                 <div class="flex items-center gap-2">
                    <p class="text-2xl font-bold text-slate-900">{semesterProgress}%</p>
                    <div class="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[80px]">
                      <div class="h-1.5 rounded-full bg-blue-600" style="width: {semesterProgress}%"></div>
                    </div>
                 </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if isAdmin}
        <div
          class="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center max-w-2xl mx-auto mt-12"
        >
          <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
             <span class="text-xl font-bold">i</span>
          </div>
          <h2 class="text-lg font-semibold text-slate-900 mb-2">
            Admin View
          </h2>
          <p class="text-slate-600">
            Admin accounts cannot create or submit classwork. Please sign in
            with a teacher account to post assignments or a student account
            to submit work.
          </p>
        </div>
      {:else if !isTeacher}
        <!-- Student Interface -->
         <div class="mt-8">
            {#if !profileQuery.data?.profile}
               <div class="rounded-xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                  <div class="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">!</div>
                  <div>
                    <h3 class="font-semibold text-amber-900">Profile Pending</h3>
                    <p class="text-sm text-amber-700 mt-1">
                      Your profile isn't set up yet. It will be created automatically when you sign in with a valid Pulchowk Campus email (e.g. 079bct000...).
                    </p>
                  </div>
               </div>
            {:else}
              <!-- View Toggles -->
              <div class="flex items-center gap-1 border-b border-slate-200 mb-6">
                 <button
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {studentView === 'todo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}"
                    onclick={() => studentView = 'todo'}
                 >
                    To Do
                    <span class="ml-2 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">
                      {todoAssignments.length}
                    </span>
                 </button>
                 <button
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {studentView === 'done' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}"
                    onclick={() => studentView = 'done'}
                 >
                    Completed
                 </button>
                 <button
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {studentView === 'subjects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}"
                    onclick={() => studentView = 'subjects'}
                 >
                    My Subjects
                 </button>
              </div>

              {#if mySubjectsQuery.isLoading}
                 <div class="py-12 flex justify-center">
                    <div class="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                 </div>
              {:else}
                 {#if studentView === 'subjects'}
                    <!-- Subjects Grid -->
                    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                       {#each mySubjectsQuery.data?.subjects || [] as subject}
                          <div class="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
                             <div class="flex justify-between items-start mb-4">
                                <div>
                                   <p class="text-xs font-semibold text-blue-600 uppercase tracking-wide">{subject.code || "Subject"}</p>
                                   <h3 class="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">{subject.title}</h3>
                                </div>
                                <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                   {(subject.assignments || []).length}
                                </div>
                             </div>
                             <div class="space-y-2 pt-4 border-t border-slate-100">
                                <div class="flex justify-between text-sm">
                                   <span class="text-slate-500">Pending tasks</span>
                                   <span class="font-medium text-slate-900">
                                      {(subject.assignments || []).filter(a => !a.submission).length}
                                   </span>
                                </div>
                             </div>
                          </div>
                       {/each}
                       {#if (mySubjectsQuery.data?.subjects || []).length === 0}
                          <div class="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                             No subjects found for this semester.
                          </div>
                       {/if}
                    </div>
                 {:else}
                    <!-- Task List (Todo/Done) -->
                    {@const assignmentsToShow = studentView === 'todo' ? todoAssignments : doneAssignments}
                    
                    <div class="space-y-4 max-w-4xl">
                       {#each assignmentsToShow as assignment}
                          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 transition-all hover:border-blue-200">
                             <div class="flex flex-col sm:flex-row gap-4 justify-between">
                                <div class="space-y-1 flex-1">
                                   <div class="flex items-center gap-2 mb-1">
                                      <span class="text-xs font-semibold px-2 py-0.5 rounded text-slate-600 bg-slate-100">
                                        {assignment.type === 'homework' ? 'Homework' : 'Classwork'}
                                      </span>
                                      <span class="text-xs font-medium text-slate-500">•</span>
                                      <span class="text-xs font-medium text-slate-500">{assignment.subjectTitle}</span>
                                      
                                      <span class={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getStatusColor(assignment)}`}>
                                         {getStatusText(assignment)}
                                      </span>
                                   </div>
                                   <h3 class="text-base font-semibold text-slate-900">{assignment.title}</h3>
                                   {#if assignment.description}
                                      <p class="text-sm text-slate-600 line-clamp-2">{assignment.description}</p>
                                   {/if}
                                   
                                   <div class="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                      {#if assignment.dueAt}
                                        <span class="flex items-center gap-1">
                                           <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                           {formatDateTime(assignment.dueAt)}
                                        </span>
                                      {/if}
                                      {#if assignment.submission}
                                         <span class="flex items-center gap-1 text-emerald-600">
                                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                                            Submitted {formatDateTime(assignment.submission.submittedAt)}
                                         </span>
                                      {/if}
                                   </div>
                                </div>
                                
                                <div class="flex items-start sm:items-center">
                                   <button 
                                      class="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors w-full sm:w-auto"
                                      onclick={() => openSubmission(assignment.id)}
                                   >
                                      {assignment.submission ? 'View / Resubmit' : 'Submit Work'}
                                   </button>
                                </div>
                             </div>

                             {#if activeSubmissionId === assignment.id}
                                <div class="mt-4 pt-4 border-t border-slate-100 animate-fade-in bg-slate-50 rounded-lg p-4 -mx-2 sm:mx-0">
                                   <h4 class="text-sm font-semibold text-slate-900 mb-3">Submit Assignment</h4>
                                   <div class="space-y-3">
                                      <div>
                                         <label class="block text-xs font-medium text-slate-700 mb-1">File (Image/PDF)</label>
                                         <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            onchange={(event) => {
                                               const target = event.target as HTMLInputElement;
                                               submissionFile = target.files ? target.files[0] : null;
                                            }}
                                         />
                                      </div>
                                      <div>
                                         <label class="block text-xs font-medium text-slate-700 mb-1">Comment (Optional)</label>
                                         <textarea
                                            rows="2"
                                            class="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                            placeholder="Add a note..."
                                            bind:value={submissionComment}
                                         ></textarea>
                                      </div>
                                      
                                      {#if submissionError}
                                         <p class="text-xs text-rose-600 font-medium">{submissionError}</p>
                                      {/if}

                                      <div class="flex gap-2 pt-2">
                                         <button
                                            class="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onclick={() => handleSubmit(assignment)}
                                            disabled={submissionLoading}
                                         >
                                            {submissionLoading ? "Submitting..." : "Turn In"}
                                         </button>
                                         <button
                                            class="bg-white border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg font-medium hover:bg-slate-50"
                                            onclick={() => activeSubmissionId = null}
                                         >
                                            Cancel
                                         </button>
                                      </div>
                                   </div>
                                </div>
                             {/if}
                          </div>
                       {/each}
                       
                       {#if assignmentsToShow.length === 0}
                          <div class="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-200">
                             <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <svg class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                             </div>
                             <p class="text-slate-900 font-medium">No {studentView === 'todo' ? 'pending' : 'completed'} assignments</p>
                             <p class="text-slate-500 text-sm">You're all caught up!</p>
                          </div>
                       {/if}
                    </div>
                 {/if}
              {/if}
            {/if}
         </div>

      {:else}
        <!-- Teacher View (Refined) -->
        <!-- Teacher Actions and List -->
        <div class="space-y-8 mt-8">
          
          <!-- Actions Grid -->
          <div class="grid md:grid-cols-2 gap-6">
             <!-- Create Assignment Card -->
             <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div class="mb-4">
                   <h2 class="text-lg font-bold text-slate-900">Create Assignment</h2>
                   <p class="text-sm text-slate-500">Post new work for your students</p>
                </div>

                <div class="space-y-4">
                   {#if assignmentError}
                      <div class="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">{assignmentError}</div>
                   {/if}
                   
                   {#if !teacherSubjectsQuery.isLoading && !teacherSubjectsQuery.data?.subjects?.length}
                      <div class="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-100">
                         You need to add a subject before you can create assignments.
                      </div>
                   {/if}

                   <div class="space-y-1">
                      <label class="text-xs font-semibold uppercase text-slate-500">Subject</label>
                      <StyledSelect
                        bind:value={assignmentForm.subjectId}
                        placeholder={teacherSubjectsQuery.data?.subjects?.length ? "Select subject" : "No subjects"}
                        options={(teacherSubjectsQuery.data?.subjects || []).map(s => ({ value: String(s.id), label: s.title }))}
                      />
                   </div>

                   <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1">
                         <label class="text-xs font-semibold uppercase text-slate-500">Type</label>
                         <StyledSelect
                           bind:value={assignmentForm.type}
                           options={[{ value: "classwork", label: "Classwork" }, { value: "homework", label: "Homework" }]}
                         />
                      </div>
                      <div class="space-y-1">
                         <label class="text-xs font-semibold uppercase text-slate-500">Due Date</label>
                         <input
                           type="datetime-local"
                           class="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                           bind:value={assignmentForm.dueAt}
                         />
                      </div>
                   </div>

                   <div class="space-y-1">
                      <label class="text-xs font-semibold uppercase text-slate-500">Title</label>
                      <input
                        class="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                        bind:value={assignmentForm.title}
                        placeholder="e.g. Lab Report 1"
                      />
                   </div>

                   <div class="space-y-1">
                      <label class="text-xs font-semibold uppercase text-slate-500">Description</label>
                      <textarea
                        rows="3"
                        class="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                        bind:value={assignmentForm.description}
                        placeholder="Instructions..."
                      ></textarea>
                   </div>

                   <button
                      class="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                      onclick={handleCreateAssignment}
                      disabled={assignmentLoading || !assignmentForm.subjectId}
                   >
                      {assignmentLoading ? "Publishing..." : "Publish Assignment"}
                   </button>
                </div>
             </div>

             <!-- Add Subject Card -->
             <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-fit">
                <div class="mb-4">
                   <h2 class="text-lg font-bold text-slate-900">Add Teaching Subject</h2>
                   <p class="text-sm text-slate-500">Assign yourself to a subject</p>
                </div>

                <div class="space-y-4">
                   {#if assignError}
                      <div class="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100">{assignError}</div>
                   {/if}

                   <div class="space-y-1">
                      <label class="text-xs font-semibold uppercase text-slate-500">Faculty</label>
                      <StyledSelect
                        bind:value={teacherAssign.facultyId}
                        placeholder="Select faculty"
                        options={(facultiesQuery.data?.faculties || []).map(f => ({ value: String(f.id), label: f.name }))}
                      />
                   </div>
                   
                   <div class="space-y-1">
                      <label class="text-xs font-semibold uppercase text-slate-500">Semester</label>
                      <StyledSelect
                        bind:value={teacherAssign.semester}
                        placeholder="Select semester"
                        options={Array.from({ length: facultiesQuery.data?.faculties?.find(f => f.id === Number(teacherAssign.facultyId))?.semestersCount || 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }))}
                      />
                   </div>

                   <div class="space-y-1">
                      <label class="text-xs font-semibold uppercase text-slate-500">Subject</label>
                      <StyledSelect
                        bind:value={teacherAssign.subjectId}
                        placeholder={availableSubjects.length === 0 ? "Select context first" : "Select subject"}
                        options={availableSubjects.map(s => ({ value: String(s.id), label: s.title }))}
                      />
                   </div>

                   <button
                      class="w-full py-2.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-900 transition disabled:opacity-50"
                      onclick={handleAddSubject}
                      disabled={assignLoading || !teacherAssign.subjectId}
                   >
                      {assignLoading ? "Adding..." : "Add Subject"}
                   </button>
                </div>
             </div>
          </div>

          <!-- Teacher Subjects List -->
          <div>
              <div class="flex items-center justify-between mb-4">
                 <h2 class="text-xl font-bold text-slate-900">Managed Subjects</h2>
                 <span class="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                    {teacherSummary.subjectCount} Total
                 </span>
              </div>

              {#if teacherSubjectsQuery.isLoading}
                 <div class="py-12 flex justify-center">
                    <div class="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                 </div>
              {:else if teacherSubjectsQuery.data?.subjects?.length}
                 <div class="grid gap-6">
                    {#each teacherSubjectsQuery.data.subjects as subject}
                       <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                             <div>
                                <h3 class="font-bold text-slate-900">{subject.title}</h3>
                                <p class="text-xs text-slate-500 font-mono">{subject.code || "NO-CODE"} • Semester {subject.semesterNumber}</p>
                             </div>
                             <div class="text-xs font-medium text-slate-500">
                                {(subject.assignments || []).length} Assignments
                             </div>
                          </div>
                          
                          <div class="p-4">
                             {#if subject.assignments?.length}
                                <div class="space-y-3">
                                   {#each subject.assignments as assignment}
                                      <div class="rounded-lg border border-slate-200 p-3 hover:border-blue-300 transition-colors bg-white">
                                         <div class="flex justify-between items-start gap-3">
                                            <div>
                                               <div class="flex items-center gap-2 mb-1">
                                                  <span class={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${assignment.type === 'homework' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                     {assignment.type}
                                                  </span>
                                                  {#if assignment.dueAt}
                                                     <span class="text-xs text-slate-500">Due {formatDate(assignment.dueAt)}</span>
                                                  {/if}
                                               </div>
                                               <p class="font-medium text-slate-900 text-sm">{assignment.title}</p>
                                            </div>
                                            <button 
                                               class="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                               onclick={() => toggleSubmissions(assignment.id)}
                                            >
                                               {submissionsByAssignment[assignment.id] ? "Hide" : "View"} Submissions
                                            </button>
                                         </div>

                                         {#if submissionsLoading[assignment.id]}
                                            <div class="mt-2 text-xs text-slate-400">Loading...</div>
                                         {/if}

                                         {#if submissionsByAssignment[assignment.id]}
                                            <div class="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-fade-in">
                                               {#if submissionsByAssignment[assignment.id].length === 0}
                                                  <p class="text-xs text-slate-400 italic">No submissions yet.</p>
                                               {:else}
                                                  {#each submissionsByAssignment[assignment.id] as submission}
                                                     <div class="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded-lg">
                                                        <div class="flex items-center gap-2">
                                                            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                               {(submission.student?.name?.[0] || "S").toUpperCase()}
                                                            </div>
                                                            <div class="flex flex-col">
                                                               <span class="font-medium text-slate-900">{submission.student?.name || submission.studentId}</span>
                                                               <span class="text-[10px] text-slate-500">{formatDateTime(submission.submittedAt)}</span>
                                                            </div>
                                                        </div>
                                                        <a href={submission.fileUrl} target="_blank" class="text-xs font-medium text-blue-600 hover:underline">View File</a>
                                                     </div>
                                                  {/each}
                                               {/if}
                                            </div>
                                         {/if}
                                      </div>
                                   {/each}
                                </div>
                             {:else}
                                <div class="text-center py-6 text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                   No assignments created yet. Use the form above to create one.
                                </div>
                             {:else}
                             {/if}
                          </div>
                       </div>
                    {/each}
                 </div>
              {:else}
                 <div class="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                    <div class="max-w-xs mx-auto">
                       <h3 class="text-lg font-medium text-slate-900 mb-2">No subjects assigned</h3>
                       <p class="text-slate-500 text-sm">Use the "Add Teaching Subject" form to assign yourself to a class and start posting work.</p>
                    </div>
                 </div>
              {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
