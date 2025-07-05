# Exam Routine Generator

A web application that allows you to upload an Excel file containing exam schedules and generate personalized exam routines based on your selected departments, courses, and sections.

## Features

- 📁 **Excel File Upload**: Supports both .xlsx and .xls files with flexible column detection
- 🎯 **Smart Filtering**: Filter by department, courses, and sections with autocomplete
- � **Intelligent Search**: Supports initials, full text, and fuzzy matching
- �📅 **Automatic Sorting**: Exams are automatically sorted by date and time
- 📷 **Image Download**: Download your routine as a high-quality PNG image
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- 🎨 **Minimalist Design**: Clean, modern interface focused on usability
- 🔧 **Universal Format Support**: Works with any valid Excel exam schedule format
- ⚡ **Real-time Processing**: Instant feedback and comprehensive error handling

## How to Use

1. **Open the Application**: Open `index.html` in your web browser
2. **Toggle Theme**: Click the 🌙/☀️ button in the top-right to switch between light and dark modes
3. **Upload Excel File**: 
   - Click "Browse Files" or drag and drop your Excel file
   - Supported formats: .xlsx, .xls
   - The app automatically detects column formats
4. **Select Your Preferences**:
   - Choose your department (optional)
   - Search and select specific courses using smart autocomplete
   - Select sections for each course or use general section search
   - Multiple selections allowed with easy removal
5. **Generate Routine**: Click "Generate My Routine"
6. **Download**: Click "Download as Image" to save your routine as PNG

## New Features

### 🌙 Dark Mode
- Click the theme toggle button in the header
- Your preference is automatically saved
- Smooth transitions between themes

### 🔧 Universal Excel Support
- **Flexible Column Detection**: Recognizes dozens of possible column name variations
- **Any Date Format**: Handles Excel serials, "July 07, 2025", "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", etc.
- **Any Time Format**: Supports 12-hour, 24-hour, Excel time serials, ranges like "9:00 AM - 11:00 AM"
- **Smart Parsing**: Case-insensitive headers, handles special characters
- **Comprehensive Validation**: Detailed error messages guide you to fix any issues

### 🎯 Enhanced Search
- **Initials Support**: Type "cn" to find "Computer Networks"
- **Fuzzy Matching**: Finds courses even with partial matches
- **Real-time Filtering**: Instant results as you type
- **Visual Tags**: Easy-to-remove selection tags

## Excel File Format

Your Excel file should contain the following columns (column names are flexible):

### Required Columns:
- **Dept.** (or "Department", "Dept", "Dep", "Dpt")
- **Course Code** (or "Course_Code", "CourseCode", "Code", "Course ID") 
- **Course Title** (or "Course_Title", "CourseTitle", "Title", "Course Name")
- **Section** (or "Sec", "Sect")
- **Exam Date** (or "Date", "Exam_Date", "ExamDate", "Exam Day")

### Optional Columns:
- **Exam Time** (or "Time", "Exam_Time", "ExamTime", "Schedule")
- **Teacher** (or "Instructor", "Faculty", "Prof", "Professor")
- **Room** (or "Venue", "Location", "Hall", "Classroom")

### Example Excel Structure:

| Dept. | Course Code | Course Title | Section | Teacher | Exam Date | Exam Time | Room |
|-------|-------------|--------------|---------|---------|-----------|-----------|------|
| BSCE | CE 3211 | Design of Steel Structures | A | ABK | July 07, 2025 | 09:00 AM - 11:00 AM | 302 |
| BSCE | CSE 4509/CSI 309 | Operating System | A | ARnA | July 07, 2025 | 09:00 AM - 11:00 AM | 324 |
| BSCE | ENG 101/ENG 1011/ENG 1105 | English I/Intensive English I | AA | MdTI | July 07, 2025 | 09:00 AM - 11:00 AM | 408 |

## File Structure

```
exam-routine/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Dependencies

The application uses the following external libraries (loaded via CDN):
- **SheetJS (xlsx)**: For reading Excel files
- **html2canvas**: For generating downloadable images

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Tips for Best Results

1. **Clean Data**: Ensure your Excel file has consistent formatting
2. **Date Format**: Use standard date formats (YYYY-MM-DD or MM/DD/YYYY)
3. **Complete Information**: Fill in as many columns as possible for better routine display
4. **Consistent Naming**: Use consistent department and section names

## Troubleshooting

### File Upload Issues
- Make sure your file is in .xlsx or .xls format
- Check that the file isn't corrupted
- Ensure the file contains data in the expected format

### Missing Data
- Verify that required columns (Date, Course Code, Section) are present
- Check for empty rows in your Excel file
- Make sure column headers match the expected names

### Download Issues
- Ensure your browser allows downloads
- Try using a different browser if downloads fail
- Check that you have sufficient disk space

## Technical Details

The application:
- Runs entirely in the browser (client-side)
- Does not send your data to any server
- Uses modern JavaScript ES6+ features
- Implements responsive CSS Grid and Flexbox layouts
- Provides real-time data filtering and sorting

## License

This project is open source and available under the MIT License.

---

**Made with ❤️ for students and educators**
