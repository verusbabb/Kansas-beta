# Member Import Feature - Preparation Guide

This document outlines what you need to prepare before implementing the member import feature and what information is needed for implementation.

## CSV File Preparation

### Required Information to Gather

Before implementation, please prepare the following information:

#### 1. CSV File Samples

Provide sample CSV files (or column headers) from both sources showing:
- All column names/headings you'll encounter
- Sample data rows (anonymized if needed)
- Examples of both address formats (combined vs. separate columns)

**Format:**
- Source 1 CSV sample
- Source 2 CSV sample

#### 2. Column Name Variations

List all variations of column names you've seen across your CSV files:

**Member Fields:**
- First Name variations: (e.g., "First Name", "firstname", "first_name", "fname")
- Last Name variations: (e.g., "Last Name", "lastname", "last_name", "lname")
- Email variations: (e.g., "Email", "email", "E-mail", "Email Address")
- Mobile Phone variations: (e.g., "Mobile Phone", "mobilephone", "cell", "Cell Phone", "mobile")
- Home Phone variations: (e.g., "Home Phone", "homephone", "phone", "home_phone")
- Address variations: (e.g., "Address", "address", "street", "Street Address")
- City variations: (e.g., "City", "city", "CITY")
- State variations: (e.g., "State", "state", "STATE", "st")
- Zip variations: (e.g., "Zip", "zip", "ZIP", "zip code", "postal code", "Postal Code")
- Pledge Class Year variations: (e.g., "Pledge Class Year", "pledgeclassyear", "year", "graduation year", "class year", "Class Year")

**Parent Fields:**
- Parent 1 First Name variations: (e.g., "Parent 1 First Name", "parent1firstname", "parent1_first_name", "Parent First Name")
- Parent 1 Last Name variations
- Parent 1 Email variations
- Parent 1 Mobile Phone variations
- Parent 2 First Name variations
- Parent 2 Last Name variations
- Parent 2 Email variations
- Parent 2 Mobile Phone variations

#### 3. Columns to Ignore

List all column names that should be ignored/skipped during import:
- Example: "Student ID", "Grade Level", "GPA", "Notes", "Registration Date", etc.

#### 4. Address Format Details

For files with **combined address fields**, provide examples:
- Format 1: "123 Main St, Lawrence, KS 66044"
- Format 2: "123 Main St, Lawrence, KS, 66044"
- Format 3: Any other variations you've seen

For files with **separate columns**, confirm the column names:
- Address, City, State, Zip (or variations)

#### 5. Required Fields

Confirm which fields are **required** for a member record:
- Minimum required: (likely `firstName`, `lastName`, `pledgeClassYear`)
- Optional fields: (all others)

#### 6. Data Validation Rules

Provide any validation rules:
- Email format requirements
- Phone number format (accept all formats or normalize?)
- ZIP code format (5-digit, 9-digit, or both?)
- State codes (2-letter codes only? Full state names?)
- Pledge class year range (e.g., 1990-2050)

#### 7. Duplicate Handling Preferences

How should duplicates be handled?

**Detection criteria:**
- Match by email? (if email exists in both)
- Match by firstName + lastName + pledgeClassYear?
- Both? (check email first, then name+year)

**User preferences:**
- Default action: Skip, Update, or Manual Review?
- Should users be able to choose per-row in preview?
- Should there be a global toggle (Skip All / Update All)?

#### 8. Parent Deduplication Preferences

How should parent duplicates be detected?

**Matching criteria (check in order):**
1. Email match (if both have emails)
2. Name + Phone match (firstName + lastName + mobilePhone)
3. Name + Email match (if phone not available)

**Default behavior:**
- When a parent already exists, reuse existing record or create new?
- Should users see parent matches in preview?

#### 9. Sample Data Structure

Provide a sample of your actual data (anonymized):

**Example CSV Row:**
```csv
First Name,Last Name,Email,Mobile Phone,Home Phone,Address,City,State,Zip,Pledge Class Year,Parent 1 First Name,Parent 1 Last Name,Parent 1 Email,Parent 1 Mobile,Parent 2 First Name,Parent 2 Last Name,Parent 2 Email,Parent 2 Mobile
John,Doe,john.doe@example.com,555-1234,555-5678,123 Main St,Lawrence,KS,66044,2024,Jane,Doe,jane.doe@example.com,555-9999,Bob,Doe,bob.doe@example.com,555-8888
```

#### 10. Expected Data Volume

- Approximate number of members per CSV file?
- Maximum expected rows in a single import?
- Will you have multiple CSV files to import sequentially?

## Implementation Checklist

Before starting implementation, ensure you have:

- [ ] Sample CSV files from both sources (or at least column headers)
- [ ] Complete list of column name variations for all fields
- [ ] List of columns to ignore
- [ ] Examples of combined address format(s)
- [ ] Required fields confirmed
- [ ] Validation rules defined
- [ ] Duplicate handling preferences chosen
- [ ] Parent deduplication preferences chosen
- [ ] Sample data structure provided
- [ ] Expected data volume estimates

## What Will Be Built

Once you provide the above information, the implementation will include:

### Frontend:
1. CSV file upload component
2. CSV parser with column mapping
3. Address format detection and normalization
4. Preview table with edit capabilities
5. Duplicate detection and highlighting
6. Validation error display
7. Bulk import submission

### Backend:
1. Member entity and migration
2. Parent entity and migration
3. Member-Parent junction table migration
4. Bulk import endpoint (`POST /members/bulk-import`)
5. Duplicate detection logic
6. Parent deduplication logic
7. Transaction-based processing
8. Error handling and reporting

### Features:
- Handles multiple CSV formats
- Column name normalization
- Combined and separate address parsing
- Parent deduplication across multiple members
- Duplicate member detection
- Preview and edit before import
- Bulk processing with transactions
- Comprehensive error reporting

## Questions to Answer

Before implementation begins, please confirm:

1. **What is the exact field list for members?**
   - All fields from your CSV (minus ignored columns)

2. **What is the exact field list for parents?**
   - All parent fields from your CSV

3. **Are there any special cases to handle?**
   - Multiple parents per member?
   - Step-parents?
   - Guardians vs. parents?

4. **What should happen if validation fails?**
   - Show errors in preview?
   - Skip invalid rows?
   - Stop entire import?

5. **Should the import be incremental or replace existing data?**
   - Add new members only?
   - Update existing members?
   - User chooses per row?

## Next Steps

1. Gather all information listed above
2. Provide sample CSV files (or column headers at minimum)
3. Answer the questions in the "Questions to Answer" section
4. Implementation can then begin with a clear specification

