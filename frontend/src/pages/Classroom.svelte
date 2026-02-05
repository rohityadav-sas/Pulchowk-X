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
    const all = subjects.flatMap((subject) =>
      (subject.assignments || []).map((a) => ({
        ...a,
        subjectTitle: subject.title,
        subjectCode: subject.code,
      })),
    );

    // Sort by due date (nearest first), then null due dates
    return all.sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  });

  const todoAssignments = $derived(
    studentAssignments.filter((a) => !a.submission),
  );
  const doneAssignments = $derived(
    studentAssignments.filter((a) => !!a.submission),
  );

  function getStatusColor(assignment: any) {
    if (assignment.submission)
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (!assignment.dueAt)
      return "bg-slate-100 text-slate-700 border-slate-200";

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

<div class="min-h-[calc(100vh-4rem)] bg-gray-50/50 px-4 py-8 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    {#if $session.isPending}
      <div class="flex items-center justify-center py-24">
        <div
          class="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"
        ></div>
      </div>
    {:else if !$session.data?.user}
      <div class="max-w-xl mx-auto text-center py-20 px-4">
        <div
          class="w-24 h-24 bg-blue-50 rounded-3xl mx-auto flex items-center justify-center mb-8 rotate-3 shadow-xl shadow-blue-100"
        >
          <svg
            class="w-12 h-12 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h1 class="text-3xl font-black text-slate-900 mb-4 tracking-tight">
          Sign in to Classroom
        </h1>
        <p class="text-slate-500 text-lg mb-8 font-medium">
          Classroom organizes your academic life. Access assignments, subjects,
          and deadlines in one place.
        </p>
        <a
          href="/register"
          class="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:shadow-2xl hover:-translate-y-1"
        >
          Get Started
          <svg
            class="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            /></svg
          >
        </a>
      </div>
    {:else}
      <!-- Header Section -->
      <div class="text-center mb-12 animate-fade-in">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4"
        >
          {isTeacher
            ? "Teacher Access"
            : isAdmin
              ? "Administrator"
              : "Student Portal"}
        </div>
        <h1
          class="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 mb-6 tracking-tight"
        >
          Your Academic <span
            class="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600"
            >Workspace</span
          >
        </h1>
        <p class="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
          {isTeacher
            ? "Manage your curriculum, track student progress, and organize assignments effortlessly."
            : isAdmin
              ? "System overview and administrative controls."
              : "Stay on top of your coursework. Track assignments, deadlines, and submissions in one hub."}
        </p>
      </div>

      {#if !isAdmin}
        <!-- Stats Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {#if isTeacher}
            <div
              class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
            >
              <div
                class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  /></svg
                >
              </div>
              <p class="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                {teacherSummary.subjectCount}
              </p>
              <p
                class="text-sm font-bold uppercase text-slate-400 tracking-wide"
              >
                Subjects
              </p>
            </div>
            <div
              class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
            >
              <div
                class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  /></svg
                >
              </div>
              <p class="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                {teacherSummary.assignmentCount}
              </p>
              <p
                class="text-sm font-bold uppercase text-slate-400 tracking-wide"
              >
                Active Tasks
              </p>
            </div>
            <div
              class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
            >
              <div
                class="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  /></svg
                >
              </div>
              <p class="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                {teacherSummary.classworkCount}
              </p>
              <p
                class="text-sm font-bold uppercase text-slate-400 tracking-wide"
              >
                Classwork
              </p>
            </div>
            <div
              class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
            >
              <div
                class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  /></svg
                >
              </div>
              <p class="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                {teacherSummary.homeworkCount}
              </p>
              <p
                class="text-sm font-bold uppercase text-slate-400 tracking-wide"
              >
                Homework
              </p>
            </div>
          {:else}
            <div
              class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
            >
              <div class="flex justify-between items-start mb-4">
                <div
                  class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"
                >
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    /></svg
                  >
                </div>
                {#if studentSummary.pendingCount > 0}
                  <span
                    class="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-full"
                    >{studentSummary.pendingCount} NEW</span
                  >
                {/if}
              </div>
              <p class="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                {studentSummary.pendingCount}
              </p>
              <p
                class="text-sm font-bold uppercase text-slate-400 tracking-wide"
              >
                To Do
              </p>
            </div>

            <div
              class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
            >
              <div
                class="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  /></svg
                >
              </div>
              <p class="text-3xl font-black text-rose-600 mb-1 tracking-tight">
                {studentSummary.overdueCount}
              </p>
              <p
                class="text-sm font-bold uppercase text-slate-400 tracking-wide"
              >
                Overdue
              </p>
            </div>

            <div
              class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
            >
              <div
                class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  /></svg
                >
              </div>
              <p class="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                {studentSummary.submittedCount}
              </p>
              <p
                class="text-sm font-bold uppercase text-slate-400 tracking-wide"
              >
                Submitted
              </p>
            </div>

            <div
              class="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 group"
            >
              <div class="flex justify-between items-start mb-4">
                <div
                  class="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform"
                >
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    /></svg
                  >
                </div>
                <span class="text-xs font-bold text-slate-400"
                  >SEM {profileQuery.data?.profile?.currentSemester ||
                    "-"}</span
                >
              </div>
              <p class="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                {semesterProgress}%
              </p>
              <p
                class="text-sm font-bold uppercase text-slate-400 tracking-wide"
              >
                Progress
              </p>
              <div class="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div
                  class="bg-amber-500 h-1.5 rounded-full"
                  style="width: {semesterProgress}%"
                ></div>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      {#if isAdmin}
        <div
          class="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center max-w-2xl mx-auto mt-12"
        >
          <div
            class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4"
          >
            <span class="text-xl font-bold">i</span>
          </div>
          <h2 class="text-lg font-semibold text-slate-900 mb-2">Admin View</h2>
          <p class="text-slate-600">
            Admin accounts cannot create or submit classwork. Please sign in
            with a teacher account to post assignments or a student account to
            submit work.
          </p>
        </div>
      {:else if !isTeacher}
        <!-- Student Interface -->
        <div class="mt-8">
          {#if !profileQuery.data?.profile}
            <div
              class="rounded-3xl border border-amber-200 bg-amber-50/50 p-8 flex gap-4 shadow-sm"
            >
              <div
                class="shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold"
              >
                !
              </div>
              <div>
                <h3 class="font-semibold text-amber-900">Profile Pending</h3>
                <p class="text-sm text-amber-700 mt-1">
                  Your profile isn't set up yet. It will be created
                  automatically when you sign in with a valid Pulchowk Campus
                  email (e.g. 079bct000...).
                </p>
              </div>
            </div>
          {:else}
            <!-- View Toggles -->
            <div
              class="flex items-center justify-center gap-2 mb-8 p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto sticky top-4 z-10 transition-all"
            >
              <button
                class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all relative {studentView ===
                'todo'
                  ? 'text-blue-700 bg-blue-50 shadow-sm ring-1 ring-blue-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}"
                onclick={() => (studentView = "todo")}
              >
                To Do
                {#if todoAssignments.length > 0}
                  <span
                    class="ml-2 bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] shadow-sm shadow-blue-200"
                    >{todoAssignments.length}</span
                  >
                {/if}
              </button>

              <button
                class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all {studentView ===
                'done'
                  ? 'text-emerald-700 bg-emerald-50 shadow-sm ring-1 ring-emerald-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}"
                onclick={() => (studentView = "done")}
              >
                Completed
              </button>

              <button
                class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all {studentView ===
                'subjects'
                  ? 'text-purple-700 bg-purple-50 shadow-sm ring-1 ring-purple-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}"
                onclick={() => (studentView = "subjects")}
              >
                My Subjects
              </button>
            </div>

            {#if mySubjectsQuery.isLoading}
              <div class="py-12 flex justify-center">
                <div
                  class="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"
                ></div>
              </div>
            {:else if studentView === "subjects"}
              <!-- Subjects Grid -->
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each mySubjectsQuery.data?.subjects || [] as subject}
                  <div
                    class="group bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 p-6 hover:-translate-y-1"
                  >
                    <div class="flex justify-between items-start mb-4">
                      <div>
                        <p
                          class="text-xs font-semibold text-blue-600 uppercase tracking-wide"
                        >
                          {subject.code || "Subject"}
                        </p>
                        <h3
                          class="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2"
                        >
                          {subject.title}
                        </h3>
                      </div>
                      <div
                        class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-xs"
                      >
                        {(subject.assignments || []).length}
                      </div>
                    </div>
                    <div class="space-y-2 pt-4 border-t border-slate-100">
                      <div class="flex justify-between text-sm">
                        <span class="text-slate-500">Pending tasks</span>
                        <span class="font-medium text-slate-900">
                          {(subject.assignments || []).filter(
                            (a) => !a.submission,
                          ).length}
                        </span>
                      </div>
                    </div>
                  </div>
                {/each}
                {#if (mySubjectsQuery.data?.subjects || []).length === 0}
                  <div
                    class="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed"
                  >
                    No subjects found for this semester.
                  </div>
                {/if}
              </div>
            {:else}
              <!-- Task List (Todo/Done) -->
              {@const assignmentsToShow =
                studentView === "todo" ? todoAssignments : doneAssignments}

              <div class="space-y-4 max-w-4xl mx-auto">
                {#each assignmentsToShow as assignment}
                  <div
                    class="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 p-6 transition-all duration-300 group"
                  >
                    <div
                      class="flex flex-col sm:flex-row gap-4 justify-between"
                    >
                      <div class="space-y-1 flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <span
                            class="text-xs font-semibold px-2 py-0.5 rounded text-slate-600 bg-slate-100"
                          >
                            {assignment.type === "homework"
                              ? "Homework"
                              : "Classwork"}
                          </span>
                          <span class="text-xs font-medium text-slate-500"
                            >•</span
                          >
                          <span class="text-xs font-medium text-slate-500"
                            >{assignment.subjectTitle}</span
                          >

                          <span
                            class={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getStatusColor(assignment)}`}
                          >
                            {getStatusText(assignment)}
                          </span>
                        </div>
                        <h3 class="text-base font-semibold text-slate-900">
                          {assignment.title}
                        </h3>
                        {#if assignment.description}
                          <p class="text-sm text-slate-600 line-clamp-2">
                            {assignment.description}
                          </p>
                        {/if}

                        <div
                          class="flex items-center gap-4 text-xs text-slate-500 mt-2"
                        >
                          {#if assignment.dueAt}
                            <span class="flex items-center gap-1">
                              <svg
                                class="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                ><path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                /></svg
                              >
                              {formatDateTime(assignment.dueAt)}
                            </span>
                          {/if}
                          {#if assignment.submission}
                            <span
                              class="flex items-center gap-1 text-emerald-600"
                            >
                              <svg
                                class="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                ><path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M5 13l4 4L19 7"
                                /></svg
                              >
                              Submitted {formatDateTime(
                                assignment.submission.submittedAt,
                              )}
                            </span>
                          {/if}
                        </div>
                      </div>

                      <div class="flex items-start sm:items-center">
                        <button
                          class="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors w-full sm:w-auto"
                          onclick={() => openSubmission(assignment.id)}
                        >
                          {assignment.submission
                            ? "View / Resubmit"
                            : "Submit Work"}
                        </button>
                      </div>
                    </div>

                    {#if activeSubmissionId === assignment.id}
                      <div
                        class="mt-4 pt-4 border-t border-slate-100 animate-fade-in bg-slate-50/50 rounded-2xl p-5"
                      >
                        <h4 class="text-sm font-bold text-slate-900 mb-4">
                          Submit Assignment
                        </h4>
                        <div class="space-y-4">
                          <div>
                            <!-- svelte-ignore a11y_label_has_associated_control -->
                            <label
                              class="block text-xs font-semibold text-slate-600 mb-2"
                              >File (Image/PDF)</label
                            >
                            <label
                              class="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-300 transition-colors"
                            >
                              <div
                                class="flex flex-col items-center justify-center pt-5 pb-6"
                              >
                                <svg
                                  class="w-8 h-8 mb-2 text-slate-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="1.5"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                                {#if submissionFile}
                                  <p class="text-sm font-medium text-blue-600">
                                    {submissionFile.name}
                                  </p>
                                  <p class="text-xs text-slate-500">
                                    Click to change file
                                  </p>
                                {:else}
                                  <p class="text-sm text-slate-500">
                                    <span class="font-semibold text-blue-600"
                                      >Click to upload</span
                                    > or drag and drop
                                  </p>
                                  <p class="text-xs text-slate-400">
                                    PNG, JPG or PDF
                                  </p>
                                {/if}
                              </div>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                class="hidden"
                                onchange={(event) => {
                                  const target =
                                    event.target as HTMLInputElement;
                                  submissionFile = target.files
                                    ? target.files[0]
                                    : null;
                                }}
                              />
                            </label>
                          </div>
                          <!-- svelte-ignore a11y_label_has_associated_control -->
                          <div>
                            <label
                              class="block text-xs font-semibold text-slate-600 mb-2"
                              >Comment (Optional)</label
                            >
                            <textarea
                              rows="2"
                              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm placeholder:text-slate-400 resize-none"
                              placeholder="Add a note..."
                              bind:value={submissionComment}
                            ></textarea>
                          </div>

                          {#if submissionError}
                            <div
                              class="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl"
                            >
                              <svg
                                class="w-4 h-4 text-rose-500 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <p class="text-xs text-rose-600 font-medium">
                                {submissionError}
                              </p>
                            </div>
                          {/if}

                          <div class="flex gap-3 pt-2">
                            <button
                              class="bg-blue-600 text-white text-sm px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-200"
                              onclick={() => handleSubmit(assignment)}
                              disabled={submissionLoading}
                            >
                              {submissionLoading ? "Submitting..." : "Turn In"}
                            </button>
                            <button
                              class="bg-white border border-slate-200 text-slate-700 text-sm px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                              onclick={() => (activeSubmissionId = null)}
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
                  <div
                    class="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-200"
                  >
                    <div
                      class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3"
                    >
                      <svg
                        class="w-6 h-6 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        /></svg
                      >
                    </div>
                    <p class="text-slate-900 font-medium">
                      No {studentView === "todo" ? "pending" : "completed"} assignments
                    </p>
                    <p class="text-slate-500 text-sm">You're all caught up!</p>
                  </div>
                {/if}
              </div>
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
            <div
              class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8"
            >
              <div class="mb-4">
                <h2 class="text-lg font-bold text-slate-900">
                  Create Assignment
                </h2>
                <p class="text-sm text-slate-500">
                  Post new work for your students
                </p>
              </div>

              <div class="space-y-4">
                {#if assignmentError}
                  <div
                    class="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100"
                  >
                    {assignmentError}
                  </div>
                {/if}

                {#if !teacherSubjectsQuery.isLoading && !teacherSubjectsQuery.data?.subjects?.length}
                  <div
                    class="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-100"
                  >
                    You need to add a subject before you can create assignments.
                  </div>
                {/if}

                <!-- svelte-ignore a11y_label_has_associated_control -->
                <div class="space-y-1">
                  <label class="text-xs font-semibold uppercase text-slate-500"
                    >Subject</label
                  >
                  <StyledSelect
                    bind:value={assignmentForm.subjectId}
                    placeholder={teacherSubjectsQuery.data?.subjects?.length
                      ? "Select subject"
                      : "No subjects"}
                    options={(teacherSubjectsQuery.data?.subjects || []).map(
                      (s) => ({ value: String(s.id), label: s.title }),
                    )}
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <div class="space-y-1">
                    <label
                      class="text-xs font-semibold uppercase text-slate-500"
                      >Type</label
                    >
                    <StyledSelect
                      bind:value={assignmentForm.type}
                      options={[
                        { value: "classwork", label: "Classwork" },
                        { value: "homework", label: "Homework" },
                      ]}
                    />
                  </div>
                  <div class="space-y-1">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label
                      class="text-xs font-semibold uppercase text-slate-500"
                      >Due Date</label
                    >
                    <input
                      type="datetime-local"
                      class="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                      bind:value={assignmentForm.dueAt}
                    />
                  </div>
                </div>

                <!-- svelte-ignore a11y_label_has_associated_control -->
                <!-- svelte-ignore a11y_label_has_associated_control -->
                <div class="space-y-1">
                  <label class="text-xs font-semibold uppercase text-slate-500"
                    >Title</label
                  >
                  <input
                    class="w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-colors shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-3 px-4"
                    bind:value={assignmentForm.title}
                    placeholder="e.g. Lab Report 1"
                  />
                </div>

                <div class="space-y-1">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label class="text-xs font-semibold uppercase text-slate-500"
                    >Description</label
                  >
                  <textarea
                    rows="3"
                    class="w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white transition-colors shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-3 px-4"
                    bind:value={assignmentForm.description}
                    placeholder="Instructions..."
                  ></textarea>
                </div>

                <button
                  class="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                  onclick={handleCreateAssignment}
                  disabled={assignmentLoading || !assignmentForm.subjectId}
                >
                  {assignmentLoading ? "Publishing..." : "Publish Assignment"}
                </button>
              </div>
            </div>

            <!-- Add Subject Card -->
            <div
              class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 h-fit"
            >
              <div class="mb-4">
                <h2 class="text-lg font-bold text-slate-900">
                  Add Teaching Subject
                </h2>
                <p class="text-sm text-slate-500">
                  Assign yourself to a subject
                </p>
              </div>

              <div class="space-y-4">
                {#if assignError}
                  <div
                    class="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-100"
                  >
                    {assignError}
                  </div>
                {/if}

                <!-- svelte-ignore a11y_label_has_associated_control -->
                <div class="space-y-1">
                  <label class="text-xs font-semibold uppercase text-slate-500"
                    >Faculty</label
                  >
                  <StyledSelect
                    bind:value={teacherAssign.facultyId}
                    placeholder="Select faculty"
                    options={(facultiesQuery.data?.faculties || []).map(
                      (f) => ({ value: String(f.id), label: f.name }),
                    )}
                  />
                </div>

                <div class="space-y-1">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label class="text-xs font-semibold uppercase text-slate-500"
                    >Semester</label
                  >
                  <StyledSelect
                    bind:value={teacherAssign.semester}
                    placeholder="Select semester"
                    options={Array.from(
                      {
                        length:
                          facultiesQuery.data?.faculties?.find(
                            (f) => f.id === Number(teacherAssign.facultyId),
                          )?.semestersCount || 8,
                      },
                      (_, i) => ({
                        value: String(i + 1),
                        label: `Semester ${i + 1}`,
                      }),
                    )}
                  />
                </div>

                <div class="space-y-1">
                  <!-- svelte-ignore a11y_label_has_associated_control -->
                  <label class="text-xs font-semibold uppercase text-slate-500"
                    >Subject</label
                  >
                  <StyledSelect
                    bind:value={teacherAssign.subjectId}
                    placeholder={availableSubjects.length === 0
                      ? "Select context first"
                      : "Select subject"}
                    options={availableSubjects.map((s) => ({
                      value: String(s.id),
                      label: s.title,
                    }))}
                  />
                </div>

                <button
                  class="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50 disabled:shadow-none"
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
              <span
                class="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold"
              >
                {teacherSummary.subjectCount} Total
              </span>
            </div>

            {#if teacherSubjectsQuery.isLoading}
              <div class="py-12 flex justify-center">
                <div
                  class="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"
                ></div>
              </div>
            {:else if teacherSubjectsQuery.data?.subjects?.length}
              <div class="grid gap-6">
                {#each teacherSubjectsQuery.data.subjects as subject}
                  <div
                    class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden"
                  >
                    <div
                      class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"
                    >
                      <div>
                        <h3 class="font-bold text-slate-900">
                          {subject.title}
                        </h3>
                        <p class="text-xs text-slate-500 font-mono">
                          {subject.code || "NO-CODE"} • Semester {subject.semesterNumber}
                        </p>
                      </div>
                      <div class="text-xs font-medium text-slate-500">
                        {(subject.assignments || []).length} Assignments
                      </div>
                    </div>

                    <div class="p-4">
                      {#if subject.assignments?.length}
                        <div class="space-y-3">
                          {#each subject.assignments as assignment}
                            <div
                              class="rounded-2xl border border-slate-100 p-4 hover:border-blue-200 transition-all bg-slate-50 hover:bg-white hover:shadow-sm"
                            >
                              <div
                                class="flex justify-between items-start gap-3"
                              >
                                <div>
                                  <div class="flex items-center gap-2 mb-1">
                                    <span
                                      class={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${assignment.type === "homework" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}
                                    >
                                      {assignment.type}
                                    </span>
                                    {#if assignment.dueAt}
                                      <span class="text-xs text-slate-500"
                                        >Due {formatDate(
                                          assignment.dueAt,
                                        )}</span
                                      >
                                    {/if}
                                  </div>
                                  <p class="font-medium text-slate-900 text-sm">
                                    {assignment.title}
                                  </p>
                                </div>
                                <button
                                  class="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                  onclick={() =>
                                    toggleSubmissions(assignment.id)}
                                >
                                  {submissionsByAssignment[assignment.id]
                                    ? "Hide"
                                    : "View"} Submissions
                                </button>
                              </div>

                              {#if submissionsLoading[assignment.id]}
                                <div class="mt-2 text-xs text-slate-400">
                                  Loading...
                                </div>
                              {/if}

                              {#if submissionsByAssignment[assignment.id]}
                                <div
                                  class="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-fade-in"
                                >
                                  {#if submissionsByAssignment[assignment.id].length === 0}
                                    <p class="text-xs text-slate-400 italic">
                                      No submissions yet.
                                    </p>
                                  {:else}
                                    {#each submissionsByAssignment[assignment.id] as submission}
                                      <div
                                        class="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded-lg"
                                      >
                                        <div class="flex items-center gap-2">
                                          <div
                                            class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold"
                                          >
                                            {(
                                              submission.student?.name?.[0] ||
                                              "S"
                                            ).toUpperCase()}
                                          </div>
                                          <div class="flex flex-col">
                                            <span
                                              class="font-medium text-slate-900"
                                              >{submission.student?.name ||
                                                submission.studentId}</span
                                            >
                                            <span
                                              class="text-[10px] text-slate-500"
                                              >{formatDateTime(
                                                submission.submittedAt,
                                              )}</span
                                            >
                                          </div>
                                        </div>
                                        <a
                                          href={submission.fileUrl}
                                          target="_blank"
                                          class="text-xs font-medium text-blue-600 hover:underline"
                                          >View File</a
                                        >
                                      </div>
                                    {/each}
                                  {/if}
                                </div>
                              {/if}
                            </div>
                          {/each}
                        </div>
                      {:else}{/if}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div
                class="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed"
              >
                <div class="max-w-xs mx-auto">
                  <h3 class="text-lg font-medium text-slate-900 mb-2">
                    No subjects assigned
                  </h3>
                  <p class="text-slate-500 text-sm">
                    Use the "Add Teaching Subject" form to assign yourself to a
                    class and start posting work.
                  </p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
