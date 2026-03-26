# Pogoda Software - Experience Data Update Guide

## Overview
The Pogoda Software pages display professional experience with a clean timeline layout. The data is currently placeholder content ready to be updated with actual information from Jaroslaw Pogoda's LinkedIn profile.

## Where to Update Experience Data

### File Location
**Frontend/portfolioResume/src/app/Pogoda-Software-Pages/experience/experience.component.ts**

### Data Structure

#### Work Experience
Located in the `experiences` array (around line 73):

```typescript
experiences: Experience[] = [
  {
    company: 'Company Name',              // Update with actual company
    role: 'Senior Position Title',        // Update with job title
    period: 'Month YYYY - Present',       // Update with employment dates
    location: 'City, Country',            // Update with location
    description: [                        // Update with responsibilities
      'Key responsibility or achievement description',
      'Another major contribution or project leadership role',
      'Technical implementation or process improvement',
      'Team collaboration or mentorship activity'
    ],
    technologies: [                       // Update with tech stack
      'Technology 1', 
      'Technology 2', 
      'Technology 3', 
      'Technology 4'
    ]
  },
  // Add more experience entries as needed
];
```

#### Education
Located in the `education` array (around line 96):

```typescript
education: Education[] = [
  {
    institution: 'University Name',       // Update with institution
    degree: 'Degree Type in Field',       // Update with degree
    period: 'YYYY - YYYY',                // Update with dates
    location: 'City, Country'             // Update with location
  }
];
```

## How to Get LinkedIn Data

### Option 1: Manual Entry
1. Visit https://www.linkedin.com/in/jaroslaw-pogoda/
2. Copy relevant information from the profile
3. Update the arrays in the component file
4. Save the file - Angular will auto-reload

### Option 2: Future API Integration
The component is structured to easily integrate with a LinkedIn API service in the future:
- Add a service to fetch LinkedIn data
- Update the component to use the service
- See `Future Enhancements` section in main README

## Styling Customization

### Colors
To change the timeline/accent color, edit:
**Frontend/portfolioResume/src/app/Pogoda-Software-Pages/experience/experience.component.scss**

Current accent color: `#4a90e2` (blue)

Search for `#4a90e2` and replace with your preferred color.

### Layout
The component uses:
- Timeline layout with markers on the left
- Card-based design for each experience
- Responsive design for mobile devices
- Technology tags displayed as pills

## Testing Your Changes

After updating the data:
1. Save the file
2. Angular dev server will auto-reload
3. Navigate to `/pogoda/experience` in your browser
4. Verify all information displays correctly

## Components Overview

- **Navigation**: `Frontend/portfolioResume/src/app/Pogoda-Software-Pages/navigation/navigation.component.ts`
- **Footer**: `Frontend/portfolioResume/src/app/Pogoda-Software-Pages/footer/footer.component.ts`
- **Home Page**: `Frontend/portfolioResume/src/app/Pogoda-Software-Pages/home/home.component.ts`
- **Experience Page**: `Frontend/portfolioResume/src/app/Pogoda-Software-Pages/experience/experience.component.ts`

## Need Help?

- Check the main `replit.md` file for overall project documentation
- Review Kevin's pages for examples of similar components
- Contact the development team for API integration questions
