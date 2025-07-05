// Debug mode - set to false to disable console logs
const DEBUG_MODE = true;

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

// Global variables to store data
let examData = []; // Add missing examData variable
let filteredData = [];
let selectedCourses = [];
let selectedSections = [];
let courseSectionMap = new Map(); // Track which sections belong to which courses
let availableCourses = [];
let availableSections = [];

// DOM elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const filtersSection = document.getElementById('filtersSection');
const routineSection = document.getElementById('routineSection');
const loading = document.getElementById('loading');
const deptSelect = document.getElementById('deptSelect');
const courseInput = document.getElementById('courseInput');
const sectionInput = document.getElementById('sectionInput');
const courseSuggestions = document.getElementById('courseSuggestions');
const sectionSuggestions = document.getElementById('sectionSuggestions');
const selectedCoursesContainer = document.getElementById('selectedCourses');
const selectedSectionsContainer = document.getElementById('selectedSections');
const sectionDropdown = document.getElementById('sectionDropdown');
const availableSectionsSelect = document.getElementById('availableSections');
const sectionAutocomplete = document.getElementById('sectionAutocomplete');
const themeToggle = document.getElementById('themeToggle');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setCurrentDate();
    initializeTheme();
    initializeVisitCounter();
    initializeScrollToTop();
    updateLastUpdated();
});

function initializeEventListeners() {
    // File input event
    fileInput.addEventListener('change', handleFileSelect);
    
    // Fix the upload area click to properly trigger file input without double popup
    uploadArea.addEventListener('click', (e) => {
        // Only trigger if clicking on the upload area itself, not the browse button
        if (e.target === uploadArea || e.target.closest('.upload-area') && !e.target.closest('.browse-btn')) {
            fileInput.click();
        }
    });
    
    // Browse button click handler
    const browseBtn = uploadArea.querySelector('.browse-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            fileInput.click();
        });
    }
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Filter change events
    deptSelect.addEventListener('change', onDepartmentChange);
    
    // Autocomplete events
    courseInput.addEventListener('input', onCourseInput);
    courseInput.addEventListener('keydown', onCourseKeydown);
    courseInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (!courseSuggestions.matches(':hover')) {
                hideSuggestions();
                // If input is empty or doesn't match a course, reset
                if (!courseInput.value || !courseInput.value.includes(' - ')) {
                    resetCourseSelection();
                }
            }
        }, 200);
    });
    
    sectionInput.addEventListener('input', onSectionInput);
    sectionInput.addEventListener('keydown', onSectionKeydown);
    sectionInput.addEventListener('blur', () => setTimeout(hideSuggestions, 200));
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            hideSuggestions();
        }
    });
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('examRoutineTheme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('examRoutineTheme', theme);
    
    // Update toggle button icon
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
}

function setCurrentDate() {
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const dateElements = document.querySelectorAll('#currentDate');
    dateElements.forEach(element => {
        element.textContent = dateString;
    });
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    // Validate file type
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        return;
    }
    
    // Show loading
    showLoading(true);
    
    // Read the file
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            parseExcelData(e.target.result);
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            alert('Error reading the Excel file. Please make sure it\'s a valid Excel file.');
            showLoading(false);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function parseExcelData(data) {
    try {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
            alert('The Excel file appears to be empty or doesn\'t contain enough data.');
            showLoading(false);
            return;
        }
        
        // Process the data
        processExamData(jsonData);
        
    } catch (error) {
        console.error('Error parsing Excel data:', error);
        alert('Error processing the Excel file. Please check the file format.');
        showLoading(false);
    }
}

function processExamData(rawData) {
    // Assume first row contains headers
    const headers = rawData[0].map(header => 
        header ? header.toString().toLowerCase().trim() : ''
    );
    
    // Find column indices based on comprehensive possible header variations
    const columnMap = {
        department: findColumnIndex(headers, ['dept.', 'dept', 'department', 'dep', 'dpt']),
        courseCode: findColumnIndex(headers, ['course code', 'course_code', 'coursecode', 'code', 'course id', 'course-code']),
        courseTitle: findColumnIndex(headers, ['course title', 'course_title', 'coursetitle', 'title', 'course name', 'course-title']),
        section: findColumnIndex(headers, ['section', 'sec', 'sect']),
        teacher: findColumnIndex(headers, ['teacher', 'instructor', 'faculty', 'prof', 'professor']),
        date: findColumnIndex(headers, ['exam date', 'exam_date', 'examdate', 'date', 'exam day', 'exam-date']),
        time: findColumnIndex(headers, ['exam time', 'exam_time', 'examtime', 'time', 'exam schedule', 'schedule', 'exam-time']),
        room: findColumnIndex(headers, ['room', 'venue', 'location', 'hall', 'classroom'])
    };
    
    debugLog('Column mapping detected:', columnMap);
    debugLog('Headers found:', headers);
    
    // Validate required columns with helpful error messages
    const requiredColumns = ['date', 'courseCode', 'section', 'department'];
    const missingColumns = requiredColumns.filter(col => columnMap[col] === -1);
    
    if (missingColumns.length > 0) {
        const columnRequirements = {
            date: 'Date column (try: "Exam Date", "Date", "Exam Day")',
            courseCode: 'Course Code column (try: "Course Code", "Code", "Course ID")', 
            section: 'Section column (try: "Section", "Sec")',
            department: 'Department column (try: "Dept", "Department", "Dept.")'
        };
        
        const missingDetails = missingColumns.map(col => columnRequirements[col]).join('\n• ');
        
        alert(`Missing required columns in your Excel file:\n\n• ${missingDetails}\n\nPlease ensure your Excel file has columns with these or similar names. Column names are case-insensitive.`);
        showLoading(false);
        return;
    }
    
    debugLog('All required columns found successfully');
    
    // Process data rows
    examData = [];
    let processedRows = 0;
    let validRows = 0;
    
    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        processedRows++;
        
        // Skip empty rows
        if (!row || row.every(cell => !cell && cell !== 0)) {
            debugLog(`Skipping empty row ${i + 1}`);
            continue;
        }
        
        try {
            const examEntry = {
                department: (row[columnMap.department] || '').toString().trim(),
                courseCode: (row[columnMap.courseCode] || '').toString().trim(),
                courseTitle: (row[columnMap.courseTitle] || '').toString().trim(),
                section: (row[columnMap.section] || '').toString().trim(),
                teacher: (row[columnMap.teacher] || '').toString().trim(),
                date: formatDate(row[columnMap.date]),
                time: formatTime(row[columnMap.time]) || (row[columnMap.time] || '').toString().trim(),
                room: (row[columnMap.room] || '').toString().trim()
            };
            
            debugLog(`Row ${i + 1}:`, examEntry);
            
            // Only add rows with essential data
            if (examEntry.courseCode && examEntry.section && examEntry.department) {
                examData.push(examEntry);
                validRows++;
            } else {
                debugLog(`Row ${i + 1} missing essential data:`, {
                    courseCode: examEntry.courseCode,
                    section: examEntry.section, 
                    department: examEntry.department
                });
            }
        } catch (error) {
            console.warn(`Error processing row ${i + 1}:`, error, 'Row data:', row);
        }
    }
    
    debugLog(`Processed ${processedRows} rows, found ${validRows} valid exam entries`);
    
    if (examData.length === 0) {
        alert(`No valid exam data found in the file. 

Please ensure your Excel file has:
• Course Code column with valid course codes
• Section column with section information  
• Department column with department names
• Date column with exam dates

Processed ${processedRows} rows but none contained all required information.`);
        showLoading(false);
        return;
    }
    
    // Populate filters and show them
    populateFilters();
    showLoading(false);
    showFilters();
    
    // Show detailed success message
    const uniqueDepts = [...new Set(examData.map(item => item.department))].length;
    const uniqueCourses = [...new Set(examData.map(item => item.courseCode))].length;
    const uniqueSections = [...new Set(examData.map(item => item.section))].length;
    
    showSuccessMessage(`✅ Successfully loaded ${examData.length} exam entries from ${processedRows} rows!
📊 Found: ${uniqueDepts} departments, ${uniqueCourses} courses, ${uniqueSections} sections`);
}

function findColumnIndex(headers, possibleNames) {
    debugLog('Finding column for names:', possibleNames, 'in headers:', headers);
    
    for (const name of possibleNames) {
        const index = headers.findIndex(header => {
            const headerLower = header.toLowerCase().trim();
            const nameLower = name.toLowerCase().trim();
            
            // Exact match
            if (headerLower === nameLower) return true;
            
            // Contains match (both ways)
            if (headerLower.includes(nameLower) || nameLower.includes(headerLower)) return true;
            
            // Remove special characters and try again
            const cleanHeader = headerLower.replace(/[^a-z0-9]/g, '');
            const cleanName = nameLower.replace(/[^a-z0-9]/g, '');
            if (cleanHeader === cleanName || cleanHeader.includes(cleanName) || cleanName.includes(cleanHeader)) return true;
            
            return false;
        });
        
        if (index !== -1) {
            debugLog(`Found column "${possibleNames[0]}" at index ${index} (header: "${headers[index]}")`);
            return index;
        }
    }
    
    debugLog(`Column not found for names:`, possibleNames);
    return -1;
}

function formatTime(timeValue) {
    if (!timeValue) return '';
    
    const timeStr = timeValue.toString().trim();
    debugLog('Formatting time:', timeStr);
    
    // If it's already in a good format, return it
    if (timeStr.match(/^\d{1,2}:\d{2}\s*[AP]M(\s*[-–—]\s*\d{1,2}:\d{2}\s*[AP]M)?$/i)) {
        return timeStr;
    }
    
    // Handle Excel time serial numbers
    if (typeof timeValue === 'number' && timeValue < 1) {
        try {
            const hours = Math.floor(timeValue * 24);
            const minutes = Math.floor((timeValue * 24 * 60) % 60);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            const formatted = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
            debugLog('Converted Excel time serial', timeValue, 'to', formatted);
            return formatted;
        } catch (error) {
            console.warn('Excel time parsing error:', error);
            return timeStr;
        }
    }
    
    // Handle 24-hour format conversion to 12-hour
    if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
        try {
            const [hours, minutes] = timeStr.split(':');
            const hour24 = parseInt(hours, 10);
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            const displayHours = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
            const formatted = `${displayHours}:${minutes} ${ampm}`;
            debugLog('Converted 24-hour', timeStr, 'to', formatted);
            return formatted;
        } catch (error) {
            console.warn('24-hour conversion error:', error);
            return timeStr;
        }
    }
    
    // Handle time ranges with different separators
    if (timeStr.includes('-') || timeStr.includes('–') || timeStr.includes('—') || timeStr.includes('to')) {
        const separators = ['-', '–', '—', 'to'];
        let separator = separators.find(sep => timeStr.includes(sep));
        
        if (separator) {
            const parts = timeStr.split(separator).map(p => p.trim());
            if (parts.length === 2) {
                const startTime = formatTime(parts[0]);
                const endTime = formatTime(parts[1]);
                return `${startTime} - ${endTime}`;
            }
        }
    }
    
    return timeStr;
}

function formatDate(dateValue) {
    if (!dateValue) return '';
    
    // Handle Excel date serial numbers (Excel stores dates as numbers)
    if (typeof dateValue === 'number') {
        try {
            const date = XLSX.SSF.parse_date_code(dateValue);
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
            return `${months[date.m - 1]} ${String(date.d).padStart(2, '0')}, ${date.y}`;
        } catch (error) {
            console.warn('Excel date parsing error:', error);
            return dateValue.toString();
        }
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
        const dateStr = dateValue.trim();
        
        // If it's already in "Month DD, YYYY" format, keep it
        if (dateStr.match(/^\w+ \d{1,2}, \d{4}$/)) {
            return dateStr;
        }
        
        // Try to parse various date formats
        let parsedDate;
        try {
            // Handle common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
            parsedDate = new Date(dateStr);
            
            // If that fails, try other parsing methods
            if (isNaN(parsedDate.getTime())) {
                // Try YYYY-MM-DD format specifically
                if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                    const parts = dateStr.split('-');
                    parsedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                }
                // Try DD/MM/YYYY or MM/DD/YYYY
                else if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
                    const parts = dateStr.split(/[\/\-]/);
                    // Assume MM/DD/YYYY format first
                    parsedDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                    
                    // If day > 12, try DD/MM/YYYY format
                    if (parseInt(parts[0]) > 12) {
                        parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                    }
                }
            }
            
            if (!isNaN(parsedDate.getTime())) {
                const months = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
                return `${months[parsedDate.getMonth()]} ${String(parsedDate.getDate()).padStart(2, '0')}, ${parsedDate.getFullYear()}`;
            }
        } catch (error) {
            console.warn('Date parsing error:', error, 'for date:', dateStr);
        }
    }
    
    return dateValue.toString();
}

function populateFilters() {
    // Get unique values
    const departments = [...new Set(examData.map(item => item.department).filter(d => d))];
    
    // Create course objects with code and title
    const courseMap = new Map();
    examData.forEach(item => {
        if (item.courseCode && item.courseTitle) {
            courseMap.set(item.courseCode, {
                code: item.courseCode,
                title: item.courseTitle,
                department: item.department
            });
        }
    });
    availableCourses = Array.from(courseMap.values());
    
    const sections = [...new Set(examData.map(item => item.section).filter(s => s))];
    availableSections = sections.map(section => ({ section, department: '' }));
    
    // Populate department select
    deptSelect.innerHTML = '<option value="">All Departments</option>';
    departments.sort().forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        deptSelect.appendChild(option);
    });
    
    // Reset selections and hide all dropdowns/autocompletes
    selectedCourses = [];
    selectedSections = [];
    courseSectionMap.clear(); // Clear the course-section mapping
    sectionDropdown.style.display = 'none';
    sectionAutocomplete.style.display = 'none';
    updateSelectedDisplay();
}

function onDepartmentChange() {
    const selectedDept = deptSelect.value;
    
    // Filter courses based on department
    let filteredCourses;
    if (selectedDept) {
        const courseMap = new Map();
        examData
            .filter(item => item.department === selectedDept)
            .forEach(item => {
                if (item.courseCode && item.courseTitle) {
                    courseMap.set(item.courseCode, {
                        code: item.courseCode,
                        title: item.courseTitle,
                        department: item.department
                    });
                }
            });
        availableCourses = Array.from(courseMap.values());
    } else {
        const courseMap = new Map();
        examData.forEach(item => {
            if (item.courseCode && item.courseTitle) {
                courseMap.set(item.courseCode, {
                    code: item.courseCode,
                    title: item.courseTitle,
                    department: item.department
                });
            }
        });
        availableCourses = Array.from(courseMap.values());
    }
    
    // Reset selections
    selectedCourses = [];
    selectedSections = [];
    courseSectionMap.clear(); // Clear the course-section mapping
    courseInput.value = '';
    sectionInput.value = '';
    resetCourseSelection();
    updateSelectedDisplay();
    updateAvailableSections();
    
    // Hide section autocomplete when department changes
    sectionAutocomplete.style.display = 'none';
}

// Autocomplete functions
function onCourseInput() {
    const query = courseInput.value.toLowerCase().trim();
    if (query.length === 0) {
        hideSuggestions();
        // Hide section-related UI when course input is cleared
        sectionDropdown.style.display = 'none';
        sectionAutocomplete.style.display = 'none';
        return;
    }
    
    const selectedDept = deptSelect.value;
    let filtered = availableCourses.filter(course => {
        const deptMatch = !selectedDept || course.department === selectedDept;
        const alreadySelected = selectedCourses.some(selected => selected.code === course.code);
        
        // Enhanced matching: support initials, course code, and full text
        const matchesQuery = 
            course.code.toLowerCase().includes(query) || 
            course.title.toLowerCase().includes(query) ||
            matchesInitials(course.title, query) ||
            matchesInitials(course.code, query);
            
        return deptMatch && !alreadySelected && matchesQuery;
    });
    
    showCourseSuggestions(filtered.slice(0, 8));
}

// Helper function to match initials (e.g., "cn" matches "Computer Networks")
function matchesInitials(text, query) {
    if (query.length < 2) return false;
    
    const words = text.toLowerCase().split(/[\s\/\-_]+/).filter(word => word.length > 0);
    const initials = words.map(word => word.charAt(0)).join('');
    
    return initials.includes(query) || initials.startsWith(query);
}

function onCourseKeydown(e) {
    const suggestions = courseSuggestions.querySelectorAll('.suggestion-item');
    const highlighted = courseSuggestions.querySelector('.highlighted');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = highlighted ? highlighted.nextElementSibling : suggestions[0];
        if (next) {
            if (highlighted) highlighted.classList.remove('highlighted');
            next.classList.add('highlighted');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = highlighted ? highlighted.previousElementSibling : suggestions[suggestions.length - 1];
        if (prev) {
            if (highlighted) highlighted.classList.remove('highlighted');
            prev.classList.add('highlighted');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlighted) {
            const courseCode = highlighted.dataset.code;
            selectCourseForSectionSelection(courseCode);
        }
    } else if (e.key === 'Escape') {
        hideSuggestions();
        resetCourseSelection();
    }
}

function resetCourseSelection() {
    courseInput.value = '';
    sectionDropdown.style.display = 'none';
    sectionAutocomplete.style.display = 'none'; // Hide section autocomplete when resetting
}

function onSectionInput() {
    const query = sectionInput.value.toLowerCase().trim();
    if (query.length === 0) {
        hideSuggestions();
        return;
    }
    
    const selectedDept = deptSelect.value;
    let sections;
    
    if (selectedCourses.length > 0) {
        // Filter sections based on selected courses
        sections = [...new Set(examData
            .filter(item => {
                const deptMatch = !selectedDept || item.department === selectedDept;
                const courseMatch = selectedCourses.some(course => course.code === item.courseCode);
                return deptMatch && courseMatch;
            })
            .map(item => item.section)
            .filter(s => s))];
    } else if (selectedDept) {
        sections = [...new Set(examData
            .filter(item => item.department === selectedDept)
            .map(item => item.section)
            .filter(s => s))];
    } else {
        sections = [...new Set(examData.map(item => item.section).filter(s => s))];
    }
    
    const filtered = sections.filter(section => {
        const alreadySelected = selectedSections.includes(section);
        const matchesQuery = section.toLowerCase().includes(query);
        return !alreadySelected && matchesQuery;
    });
    
    showSectionSuggestions(filtered.slice(0, 5));
}

function onSectionKeydown(e) {
    const suggestions = sectionSuggestions.querySelectorAll('.suggestion-item');
    const highlighted = sectionSuggestions.querySelector('.highlighted');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = highlighted ? highlighted.nextElementSibling : suggestions[0];
        if (next) {
            if (highlighted) highlighted.classList.remove('highlighted');
            next.classList.add('highlighted');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = highlighted ? highlighted.previousElementSibling : suggestions[suggestions.length - 1];
        if (prev) {
            if (highlighted) highlighted.classList.remove('highlighted');
            prev.classList.add('highlighted');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlighted) {
            const section = highlighted.dataset.section;
            selectSection(section);
        }
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
}

function showCourseSuggestions(courses) {
    courseSuggestions.innerHTML = '';
    
    if (courses.length === 0) {
        hideSuggestions();
        return;
    }
    
    courses.forEach(course => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.dataset.code = course.code;
        item.innerHTML = `
            <div class="suggestion-code">${course.code}</div>
            <div class="suggestion-title">${course.title}</div>
        `;
        item.addEventListener('click', () => selectCourseForSectionSelection(course.code));
        courseSuggestions.appendChild(item);
    });
    
    courseSuggestions.style.display = 'block';
}

function selectCourseForSectionSelection(courseCode) {
    const course = availableCourses.find(c => c.code === courseCode);
    if (!course) return;
    
    // Clear the input but don't add to selected courses yet
    courseInput.value = `${course.code} - ${course.title}`;
    hideSuggestions();
    
    // Show sections for this course (this will show the dropdown and hide autocomplete)
    showSectionsForCourse(courseCode);
    
    // Don't show section autocomplete here - the dropdown is the primary interface
    // Section autocomplete is only for additional general section search
}

function showSectionsForCourse(courseCode) {
    const selectedDept = deptSelect.value;
    
    // Get sections for this specific course
    const courseSections = [...new Set(examData
        .filter(item => {
            const deptMatch = !selectedDept || item.department === selectedDept;
            const courseMatch = item.courseCode === courseCode;
            return deptMatch && courseMatch;
        })
        .map(item => item.section)
        .filter(s => s))];
    
    // Populate the dropdown
    availableSectionsSelect.innerHTML = '';
    
    if (courseSections.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No sections available for this course';
        option.disabled = true;
        availableSectionsSelect.appendChild(option);
    } else {
        courseSections.sort().forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = `Section ${section}`;
            availableSectionsSelect.appendChild(option);
        });
    }
    
    // Show the section dropdown and hide autocomplete
    sectionDropdown.style.display = 'block';
    sectionAutocomplete.style.display = 'none';
}

function addSelectedSections() {
    const selectedOptions = Array.from(availableSectionsSelect.selectedOptions);
    if (selectedOptions.length === 0) {
        alert('Please select at least one section.');
        return;
    }
    
    // Get the course from the input
    const courseText = courseInput.value;
    const courseCode = courseText.split(' - ')[0];
    const course = availableCourses.find(c => c.code === courseCode);
    
    if (!course) return;
    
    // Add course to selected courses if not already there
    if (!selectedCourses.some(selected => selected.code === courseCode)) {
        selectedCourses.push(course);
    }
    
    // Track course-section relationships
    selectedOptions.forEach(option => {
        const section = option.value;
        if (!selectedSections.includes(section)) {
            selectedSections.push(section);
        }
        
        // Store which course this section was selected for
        if (!courseSectionMap.has(courseCode)) {
            courseSectionMap.set(courseCode, []);
        }
        if (!courseSectionMap.get(courseCode).includes(section)) {
            courseSectionMap.get(courseCode).push(section);
        }
    });
    
    // Reset the interface
    courseInput.value = '';
    sectionDropdown.style.display = 'none';
    sectionAutocomplete.style.display = 'none'; // Hide section autocomplete after adding sections
    
    // Update display
    updateSelectedDisplay();
    updateAvailableSections();
}

function showSectionSuggestions(sections) {
    sectionSuggestions.innerHTML = '';
    
    if (sections.length === 0) {
        hideSuggestions();
        return;
    }
    
    sections.forEach(section => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.dataset.section = section;
        item.textContent = section;
        item.addEventListener('click', () => selectSection(section));
        sectionSuggestions.appendChild(item);
    });
    
    sectionSuggestions.style.display = 'block';
}

function hideSuggestions() {
    courseSuggestions.style.display = 'none';
    sectionSuggestions.style.display = 'none';
}

function selectCourse(courseCode) {
    const course = availableCourses.find(c => c.code === courseCode);
    if (course && !selectedCourses.some(selected => selected.code === courseCode)) {
        selectedCourses.push(course);
        courseInput.value = '';
        hideSuggestions();
        updateSelectedDisplay();
        updateAvailableSections();
    }
}

function selectSection(section) {
    if (!selectedSections.includes(section)) {
        selectedSections.push(section);
        sectionInput.value = '';
        hideSuggestions();
        updateSelectedDisplay();
    }
}

function removeSelectedCourse(courseCode) {
    // Remove the course
    selectedCourses = selectedCourses.filter(course => course.code !== courseCode);
    
    // Remove sections that were selected for this course
    const courseSections = courseSectionMap.get(courseCode) || [];
    courseSections.forEach(section => {
        const sectionIndex = selectedSections.indexOf(section);
        if (sectionIndex > -1) {
            selectedSections.splice(sectionIndex, 1);
        }
    });
    
    // Remove from course-section mapping
    courseSectionMap.delete(courseCode);
    
    updateSelectedDisplay();
    updateAvailableSections();
}

function removeSelectedSection(section) {
    // Remove the section from selectedSections
    selectedSections = selectedSections.filter(s => s !== section);
    
    // Remove from course-section mapping and clean up courses with no sections
    for (const [courseCode, sections] of courseSectionMap.entries()) {
        const sectionIndex = sections.indexOf(section);
        if (sectionIndex > -1) {
            sections.splice(sectionIndex, 1);
            
            // If this course has no more sections, remove the course entirely
            if (sections.length === 0) {
                courseSectionMap.delete(courseCode);
                selectedCourses = selectedCourses.filter(course => course.code !== courseCode);
            }
        }
    }
    
    updateSelectedDisplay();
}

function updateSelectedDisplay() {
    // Update selected courses display with their sections
    const coursesHtml = selectedCourses.map(course => {
        const courseSections = courseSectionMap.get(course.code) || [];
        const sectionsText = courseSections.length > 0 ? ` (Sections: ${courseSections.join(', ')})` : '';
        
        return `
            <div class="selected-item">
                <span>${course.code} - ${course.title}${sectionsText}</span>
                <button class="remove-btn" onclick="removeSelectedCourse('${course.code}')">×</button>
            </div>
        `;
    }).join('');
    
    selectedCoursesContainer.innerHTML = `
        <div class="selected-label">Selected Courses & Sections:</div>
        ${coursesHtml}
    `;
    
    // Update selected sections display (simplified)
    const sectionsHtml = selectedSections.map(section => `
        <div class="selected-item">
            <span>Section ${section}</span>
            <button class="remove-btn" onclick="removeSelectedSection('${section}')">×</button>
        </div>
    `).join('');
    
    selectedSectionsContainer.innerHTML = `
        <div class="selected-label">All Selected Sections:</div>
        ${sectionsHtml}
    `;
}

function updateAvailableSections() {
    // This function updates available sections based on selected courses
    // Implementation is handled in onSectionInput
}

function generateRoutine() {
    const selectedDept = deptSelect.value;
    const selectedCourseCodes = selectedCourses.map(course => course.code);
    
    if (selectedSections.length === 0) {
        alert('Please select at least one section to generate the routine.');
        return;
    }
    
    debugLog('Generating routine with:');
    debugLog('Selected courses:', selectedCourseCodes);
    debugLog('Selected sections:', selectedSections);
    debugLog('Course-section map:', courseSectionMap);
    
    // Clear previous routine data
    filteredData = [];
    const routineBody = document.getElementById('routineBody');
    if (routineBody) {
        routineBody.innerHTML = '';
    }
    
    // Filter data based on exact course-section combinations
    filteredData = examData.filter(item => {
        const deptMatch = !selectedDept || item.department === selectedDept;
        
        // Check if this is an exact course-section combination we selected
        let isValidCombination = false;
        
        if (selectedCourseCodes.length === 0) {
            // If no specific courses selected, include all sections we selected
            isValidCombination = selectedSections.includes(item.section);
        } else {
            // Check if this course-section combination was specifically selected
            for (const [courseCode, sections] of courseSectionMap.entries()) {
                if (item.courseCode === courseCode && sections.includes(item.section)) {
                    isValidCombination = true;
                    break;
                }
            }
        }
        
        debugLog(`Item: ${item.courseCode} ${item.section} - Valid: ${isValidCombination}`);
        
        return deptMatch && isValidCombination;
    });
    
    debugLog('Filtered data:', filteredData);
    
    if (filteredData.length === 0) {
        alert('No exams found for the selected criteria. Please check your course and section combinations.');
        return;
    }
    
    // Sort by date first, then by time
    filteredData.sort((a, b) => {
        // Parse dates properly without timezone issues
        const parseDate = (dateStr) => {
            if (!dateStr) return new Date(0);
            
            // If it's in "July 07, 2025" format, parse directly
            if (dateStr.match(/^\w+ \d{1,2}, \d{4}$/)) {
                return new Date(dateStr + ' 00:00:00');
            }
            
            // If it's in YYYY-MM-DD format
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const parts = dateStr.split('-');
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
            
            // Fallback
            return new Date(dateStr + ' 00:00:00');
        };
        
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }
        
        // If dates are same, sort by time
        return compareTime(a.time, b.time);
    });
    
    debugLog('Sorted filtered data:', filteredData);
    
    // Update routine title
    let titleParts = [];
    if (selectedDept) titleParts.push(selectedDept);
    
    // Show course-section combinations in title
    const combinationText = Array.from(courseSectionMap.entries())
        .map(([course, sections]) => `${course}(${sections.join(',')})`)
        .join(', ');
    
    if (combinationText) {
        titleParts.push(combinationText);
    } else if (selectedSections.length <= 3) {
        titleParts.push(`Section${selectedSections.length > 1 ? 's' : ''}: ${selectedSections.join(', ')}`);
    } else {
        titleParts.push(`${selectedSections.length} Sections`);
    }
    
    document.getElementById('routineTitle').textContent = 
        `Exam Routine - ${titleParts.join(' - ')}`;
    
    // Generate table
    generateRoutineTable();
    
    // Hide any active course/section selection UI since routine is generated
    sectionDropdown.style.display = 'none';
    sectionAutocomplete.style.display = 'none';
    
    // Show routine section
    showRoutine();
}

// Helper function to compare time strings
function compareTime(timeA, timeB) {
    if (!timeA || !timeB) return 0;
    
    debugLog('Comparing times:', timeA, 'vs', timeB);
    
    // Handle format like "09:00 AM - 11:00 AM"
    const extractStartTime = (timeStr) => {
        if (timeStr.includes('-') || timeStr.includes('–') || timeStr.includes('—')) {
            return timeStr.split(/[-–—]/)[0].trim();
        }
        if (timeStr.includes('to')) {
            return timeStr.split('to')[0].trim();
        }
        return timeStr.trim();
    };
    
    const startTimeA = extractStartTime(timeA);
    const startTimeB = extractStartTime(timeB);
    
    debugLog('Extracted start times:', startTimeA, 'vs', startTimeB);
    
    // Convert to 24-hour format for comparison
    const convertTo24Hour = (time12h) => {
        try {
            // Handle formats like "09:00 AM", "9:00 AM", "9 AM", "09:00", "21:00"
            const cleanTime = time12h.trim().toUpperCase();
            
            // If already in 24-hour format (no AM/PM)
            if (!cleanTime.includes('AM') && !cleanTime.includes('PM')) {
                // Handle formats like "09:00" or "21:00"
                if (cleanTime.match(/^\d{1,2}:\d{2}$/)) {
                    return cleanTime.padStart(5, '0');
                }
                // Handle formats like "9" or "21"
                if (cleanTime.match(/^\d{1,2}$/)) {
                    return cleanTime.padStart(2, '0') + ':00';
                }
                return cleanTime;
            }
            
            // Handle 12-hour format with AM/PM
            const parts = cleanTime.split(/\s+/);
            if (parts.length < 2) return cleanTime;
            
            const timePart = parts[0];
            const ampm = parts[parts.length - 1]; // Last part should be AM/PM
            
            // Handle time part
            let hour24, minutes;
            if (timePart.includes(':')) {
                [hour24, minutes] = timePart.split(':');
            } else {
                hour24 = timePart;
                minutes = '00';
            }
            
            hour24 = parseInt(hour24, 10);
            
            if (ampm === 'PM' && hour24 !== 12) {
                hour24 += 12;
            } else if (ampm === 'AM' && hour24 === 12) {
                hour24 = 0;
            }
            
            const result = `${hour24.toString().padStart(2, '0')}:${minutes}`;
            debugLog('Converted', time12h, 'to', result);
            return result;
        } catch (error) {
            console.warn('Time parsing error:', error, 'for time:', time12h);
            return time12h;
        }
    };
    
    try {
        const time24A = convertTo24Hour(startTimeA);
        const time24B = convertTo24Hour(startTimeB);
        return time24A.localeCompare(time24B);
    } catch (error) {
        console.warn('Time comparison error:', error);
        // Fallback to string comparison
        return startTimeA.localeCompare(startTimeB);
    }
}

function generateRoutineTable() {
    const tbody = document.getElementById('routineBody');
    tbody.innerHTML = '';
    
    debugLog('Generating table with filtered data:', filteredData);
    
    filteredData.forEach((exam, index) => {
        const row = document.createElement('tr');
        
        // Format date using our robust formatDate function or display friendly format
        let formattedDate = exam.date;
        try {
            if (exam.date) {
                // Use the parsed date from formatDate or convert to display format
                if (exam.date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                    // Convert YYYY-MM-DD to readable format
                    const parts = exam.date.split('-');
                    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    formattedDate = date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } else if (exam.date.match(/^\w+ \d{1,2}, \d{4}$/)) {
                    // Already in good format like "July 07, 2025"
                    formattedDate = exam.date;
                } else {
                    // Try generic parsing for other formats
                    const date = new Date(exam.date);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Date display formatting error:', e, 'for date:', exam.date);
            // Keep original format if parsing fails
        }
        
        // Format time using our robust formatTime function
        const formattedTime = exam.time || '';
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td>${exam.courseCode}</td>
            <td>${exam.courseTitle}</td>
            <td>${exam.section}</td>
            <td>${exam.teacher}</td>
            <td>${exam.room}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function downloadRoutine() {
    const routineContainer = document.getElementById('routineContainer');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;
    
    // Show loading with different messages for mobile/desktop
    downloadBtn.innerHTML = isMobile ? '⏳ Optimizing for mobile...' : '⏳ Generating...';
    downloadBtn.disabled = true;
    
    if (isMobile) {
        downloadMobileOptimized(routineContainer);
    } else {
        downloadDesktop(routineContainer);
    }
}

function downloadDesktop(routineContainer) {
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Get current theme and background color
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const backgroundColor = currentTheme === 'dark' ? '#1a1a1a' : '#ffffff';
    
    // Hide the download button before capture
    downloadBtn.style.display = 'none';
    
    // Configure html2canvas options for desktop with theme-appropriate background
    const options = {
        backgroundColor: backgroundColor,
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        width: routineContainer.scrollWidth,
        height: routineContainer.scrollHeight
    };
    
    html2canvas(routineContainer, options).then(canvas => {
        // Show the download button after capture
        downloadBtn.style.display = 'block';
        downloadCanvas(canvas);
    }).catch(error => {
        // Show the download button after error
        downloadBtn.style.display = 'block';
        handleDownloadError(error);
    });
}

function downloadMobileOptimized(routineContainer) {
    // Get current theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = currentTheme === 'dark';
    
    // Define theme-specific colors
    const themeColors = {
        light: {
            bgPrimary: '#ffffff',
            bgSecondary: '#f8f9fa',
            textPrimary: '#212529',
            textSecondary: '#6c757d',
            borderColor: '#dee2e6',
            tableStripe: '#f8f9fa'
        },
        dark: {
            bgPrimary: '#1a1a1a',
            bgSecondary: '#2d2d2d',
            textPrimary: '#ffffff',
            textSecondary: '#b3b3b3',
            borderColor: '#404040',
            tableStripe: '#2d2d2d'
        }
    };
    
    const colors = themeColors[currentTheme];
    
    // Create a temporary container for mobile-optimized layout
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: fixed;
        top: -9999px;
        left: 0;
        width: 800px;
        padding: 20px;
        background: ${colors.bgPrimary};
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: ${colors.textPrimary};
        z-index: -1;
    `;
    
    // Clone the routine content
    const routineClone = routineContainer.cloneNode(true);
    
    // Apply mobile-optimized styles with theme support
    const mobileStyles = `
        <style>
            .routine-container {
                width: 100% !important;
                max-width: none !important;
                padding: 20px !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                background: ${colors.bgPrimary} !important;
                color: ${colors.textPrimary} !important;
            }
            
            .routine-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid ${colors.borderColor};
            }
            
            .routine-title {
                font-size: 24px;
                font-weight: 600;
                color: ${colors.textPrimary};
                margin-bottom: 8px;
                line-height: 1.2;
            }
            
            .routine-subtitle {
                font-size: 14px;
                color: ${colors.textSecondary};
                font-style: italic;
            }
            
            .table-container {
                width: 100%;
                overflow: visible !important;
                margin-bottom: 20px;
            }
            
            .routine-table {
                width: 100% !important;
                border-collapse: collapse;
                background: ${colors.bgPrimary};
                font-size: 12px;
                border: 1px solid ${colors.borderColor};
            }
            
            .routine-table th {
                background: ${colors.bgSecondary} !important;
                padding: 10px 6px !important;
                text-align: left;
                font-weight: 600;
                color: ${colors.textPrimary} !important;
                border: 1px solid ${colors.borderColor} !important;
                font-size: 11px;
                line-height: 1.2;
            }
            
            .routine-table td {
                padding: 8px 6px !important;
                border: 1px solid ${colors.borderColor} !important;
                color: ${colors.textPrimary} !important;
                font-size: 11px;
                line-height: 1.3;
                word-wrap: break-word;
                max-width: 80px;
            }
            
            .routine-table tr:nth-child(even) {
                background: ${colors.tableStripe} !important;
            }
            
            .download-btn {
                display: none !important;
            }
            
            /* Ensure proper column widths */
            .routine-table th:nth-child(1),
            .routine-table td:nth-child(1) { width: 15%; } /* Date */
            .routine-table th:nth-child(2),
            .routine-table td:nth-child(2) { width: 12%; } /* Time */
            .routine-table th:nth-child(3),
            .routine-table td:nth-child(3) { width: 12%; } /* Course Code */
            .routine-table th:nth-child(4),
            .routine-table td:nth-child(4) { width: 25%; } /* Course Title */
            .routine-table th:nth-child(5),
            .routine-table td:nth-child(5) { width: 8%; }  /* Section */
            .routine-table th:nth-child(6),
            .routine-table td:nth-child(6) { width: 18%; } /* Teacher */
            .routine-table th:nth-child(7),
            .routine-table td:nth-child(7) { width: 10%; } /* Room */
        </style>
    `;
    
    // Add styles to the cloned content
    tempContainer.innerHTML = mobileStyles + routineClone.outerHTML;
    document.body.appendChild(tempContainer);
    
    // Wait for styles to apply
    setTimeout(() => {
        const optimizedContainer = tempContainer.querySelector('.routine-container');
        
        // Configure html2canvas options for mobile with theme-appropriate background
        const options = {
            backgroundColor: colors.bgPrimary,
            scale: 2,
            useCORS: true,
            logging: false,
            width: 800,
            height: optimizedContainer.scrollHeight,
            windowWidth: 800,
            windowHeight: optimizedContainer.scrollHeight
        };
        
        html2canvas(optimizedContainer, options).then(canvas => {
            // Clean up
            document.body.removeChild(tempContainer);
            downloadCanvas(canvas);
        }).catch(error => {
            // Clean up on error
            document.body.removeChild(tempContainer);
            handleDownloadError(error);
        });
    }, 100);
}

function downloadCanvas(canvas) {
    // Create download link
    const link = document.createElement('a');
    link.download = `exam-routine-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Reset button
    document.getElementById('downloadBtn').innerHTML = '📷 Download as Image';
    document.getElementById('downloadBtn').disabled = false;
    
    showSuccessMessage('Routine downloaded successfully!');
}

function handleDownloadError(error) {
    console.error('Error generating image:', error);
    alert('Error generating the image. Please try again.');
    
    // Reset button
    document.getElementById('downloadBtn').innerHTML = '📷 Download as Image';
    document.getElementById('downloadBtn').disabled = false;
}

// Utility functions
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

function showFilters() {
    filtersSection.style.display = 'block';
    filtersSection.classList.add('fade-in');
}

function showRoutine() {
    // Hide any previous routine
    routineSection.style.display = 'none';
    
    // Small delay to ensure clean display
    setTimeout(() => {
        routineSection.style.display = 'block';
        routineSection.classList.add('fade-in');
        
        // Scroll to routine section
        routineSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function showSuccessMessage(message) {
    // Remove existing success messages
    const existingMessages = document.querySelectorAll('.success-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(successDiv, container.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

// Global functions for HTML onclick events
window.addSelectedSections = addSelectedSections;
window.removeSelectedCourse = removeSelectedCourse;
window.removeSelectedSection = removeSelectedSection;
window.generateRoutine = generateRoutine;
window.downloadRoutine = downloadRoutine;
window.scrollToTop = scrollToTop;
window.showHelp = showHelp;
window.showAbout = showAbout;

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    showLoading(false);
});

// Prevent default drag behaviors on the document
document.addEventListener('dragover', function(e) {
    e.preventDefault();
});

document.addEventListener('drop', function(e) {
    e.preventDefault();
});

// Footer functionality
function initializeVisitCounter() {
    // Get current visit count from localStorage
    let visitCount = localStorage.getItem('examRoutineVisitCount');
    if (!visitCount) {
        visitCount = 0;
    }
    
    // Increment visit count
    visitCount = parseInt(visitCount) + 1;
    
    // Save updated count
    localStorage.setItem('examRoutineVisitCount', visitCount);
    
    // Display count with animation
    const visitCountElement = document.getElementById('visitCount');
    if (visitCountElement) {
        // Animate the counter
        animateCounter(visitCountElement, 0, visitCount, 1000);
    }
}

function animateCounter(element, start, end, duration) {
    const startTime = performance.now();
    const difference = end - start;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(start + (difference * easeOutQuart));
        
        element.textContent = currentCount.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = end.toLocaleString();
        }
    }
    
    requestAnimationFrame(updateCounter);
}

function initializeScrollToTop() {
    // Create scroll to top button
    const scrollButton = document.createElement('button');
    scrollButton.className = 'scroll-to-top';
    scrollButton.innerHTML = '↑';
    scrollButton.setAttribute('aria-label', 'Scroll to top');
    scrollButton.onclick = scrollToTop;
    document.body.appendChild(scrollButton);
    
    // Show/hide scroll button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollButton.classList.add('show');
        } else {
            scrollButton.classList.remove('show');
        }
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const now = new Date();
        const options = { year: 'numeric', month: 'long' };
        lastUpdatedElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function showHelp() {
    const helpMessage = `
🔧 How to Use Exam Routine Generator:

1. 📁 Upload Excel File
   • Click "Browse Files" or drag & drop
   • Supported: .xlsx, .xls files
   • Required columns: Department, Course Code, Section, Date

2. 🎯 Filter Your Data
   • Select department (optional)
   • Search courses by code/name/initials
   • Choose specific sections

3. 📅 Generate Routine
   • Click "Generate My Routine"
   • View sorted exam schedule
   • Download as PNG image

💡 Tips:
• Use dark mode toggle (🌙) for better viewing
• Search "cn" to find "Computer Networks"
• Multiple sections can be selected
• All data processed locally (secure)

❓ Need more help? Check the GitHub repository for detailed documentation.
    `;
    
    alert(helpMessage);
}

function showAbout() {
    const aboutMessage = `
📅 Exam Routine Generator v2.0

🎯 Purpose:
Create personalized exam schedules from Excel files with modern web technologies.

✨ Key Features:
• 📁 Universal Excel format support
• 🌙 Dark/Light mode with persistence
• 📱 Fully responsive design
• 🔍 Smart search with autocomplete
• 📷 High-quality image export
• ⚡ Client-side processing (no server required)

🛠️ Technology Stack:
• HTML5, CSS3, JavaScript (ES6+)
• SheetJS for Excel parsing
• html2canvas for image generation
• CSS Grid & Flexbox for layouts

👨‍💻 Open Source:
This project is open source and available on GitHub.
Contributions and feedback are welcome!

🚀 Deployment:
• GitHub Pages ready
• Works on any static hosting
• No backend required

Made with ❤️ for students and educators worldwide.
    `;
    
    alert(aboutMessage);
}

// Add visit tracking for different actions
function trackAction(actionName) {
    const actionsKey = 'examRoutineActions';
    let actions = JSON.parse(localStorage.getItem(actionsKey) || '{}');
    
    if (!actions[actionName]) {
        actions[actionName] = 0;
    }
    actions[actionName]++;
    
    localStorage.setItem(actionsKey, JSON.stringify(actions));
    
    debugLog(`Action tracked: ${actionName} (${actions[actionName]} times)`);
}

// Enhanced event tracking
const originalGenerateRoutine = generateRoutine;
generateRoutine = function() {
    trackAction('routine_generated');
    return originalGenerateRoutine.apply(this, arguments);
};

const originalDownloadRoutine = downloadRoutine;
downloadRoutine = function() {
    trackAction('routine_downloaded');
    return originalDownloadRoutine.apply(this, arguments);
};

const originalProcessFile = processFile;
processFile = function() {
    trackAction('file_uploaded');
    return originalProcessFile.apply(this, arguments);
};
