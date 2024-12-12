// Profile scraping function that will run in the context of the LinkedIn page

class ProfileData {
    constructor() {
        this.profileURL = window.location.href; //DONE
        this.name = ''; //DONE
        this.headline = ''; //DONE
        this.location = ''; //DONE
        this.about = ''; //DONE
        this.experience = []; //DONE
        this.education = []; //DONE
        this.skills = []; //DONE
        this.projects = []; //
        //this.licenses = []; //TODO
    }

    getProfileData() {
        return this;
    }

    async scrapeProfileData() { //DONE
        this.name = document.querySelector('h1.inline.t-24.v-align-middle.break-words')?.textContent?.trim();
        this.headline = document.querySelector('.text-body-medium')?.textContent?.trim();
        this.location = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.textContent?.trim();
        this.about = document.querySelector('#about')?.closest('section')?.querySelector('.display-flex.ph5.pv3 .full-width[dir="ltr"] span[aria-hidden="true"]')?.textContent?.trim();
        this.experience = this.getExperienceSection();
        this.education = this.getEducationSection();
        this.projects = this.getProjectsSection();
    }

    getExperienceSection() { //Have to work on getting the description
        const experienceSectionList = document.querySelector('#experience')?.closest('section')?.querySelectorAll('li.artdeco-list__item div.display-flex.flex-column.full-width');
        const experience = [];
        if (experienceSectionList) {
            for (const experienceItem of experienceSectionList) {
                const experienceTitle = experienceItem.querySelector('div.display-flex.flex-wrap.align-items-center.full-height span[aria-hidden="true"]');
                const experienceCompany = experienceItem.querySelector('span.t-14.t-normal span[aria-hidden="true"]');
                const dateAndLocation = experienceItem.querySelectorAll('span.t-14.t-normal.t-black--light span[aria-hidden="true"]');
                const experienceDate = dateAndLocation[0];  // First element is the date
                const experienceLocation = dateAndLocation[1];  // Second element is the location
                const experienceDescription = experienceItem.querySelector('div[class*="pvs-entity__sub-components"] span[aria-hidden="true"]')?.textContent?.trim();
                
                experience.push({
                    title: experienceTitle?.textContent?.trim() || '',
                    company: experienceCompany?.textContent?.trim() || '',
                    date: experienceDate?.textContent?.trim() || '',
                    location: experienceLocation?.textContent?.trim() || '',
                    description: experienceDescription?.textContent?.trim() || 'Description not found'
                });
            }
        }
        return experience;
    }

    getEducationSection() { //DONE
        const educationSectionList = document.querySelector('#education')?.closest('section')?.querySelectorAll('li');
        const education = [];
        if (educationSectionList) {
            for (const educationItem of educationSectionList) {
                const educationTitle = educationItem.querySelector('.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
                const educationDegree = educationItem.querySelector('.t-14.t-normal span[aria-hidden="true"]');
                const educationDate = educationItem.querySelector('.pvs-entity__caption-wrapper[aria-hidden="true"]');
                // Updated description selector
                const descriptionElement = educationItem.querySelector('.display-flex.flex-column.align-self-center.flex-grow-1 div:nth-child(2) span[aria-hidden="true"]');
                const educationDescription = descriptionElement?.textContent?.trim() || '';
                
                if (educationTitle && educationDegree && educationDate) {
                    education.push({
                        schoolName: educationTitle.textContent.trim(),
                        degree: educationDegree.textContent.trim(),
                        date: educationDate.textContent.trim(),
                        description: educationDescription
                    });
                }
            }
        }
        return education;
    }

    getProjectsSection() { //TODO
        const projectsSectionList = document.querySelector('#projects')?.closest('section')?.querySelectorAll('li.artdeco-list__item');
        const projects = [];
        if (projectsSectionList) {
            for (const projectItem of projectsSectionList) {
                const projectTitle = projectItem.querySelector('.display-flex.flex-wrap.align-items-center.full-height span[aria-hidden="true"]');
                const projectDescription = projectItem.querySelector('li.pvs-list__item--with-top-padding div.display-flex.full-width span[aria-hidden="true"]');
                projects.push({
                    title: projectTitle?.textContent?.trim() || '',
                    description: projectDescription?.textContent?.trim() || ''
                });
            }
        }
        return projects;
    }
    getLicensesSection() { //TODO
    }
}

async function scrapeLinkedInProfile() {
    const profileData = new ProfileData();
    await profileData.scrapeProfileData();
    console.log("Final profile data:", profileData.getProfileData());
    return profileData.getProfileData();
}