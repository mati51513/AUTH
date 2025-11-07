// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            window.scrollTo({
                top: targetSection.offsetTop - 70,
                behavior: 'smooth'
            });
        });
    });
    
    // Form submission handling
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            // Simple form validation
            if (!name || !email || !subject || !message) {
                alert('Please fill in all fields');
                return;
            }
            
            // In a real application, you would send this data to a server
            // For demo purposes, we'll just show a success message
            alert(`Thank you for your message, ${name}! I'll get back to you soon.`);
            contactForm.reset();
        });
    }
    
    // Add active class to nav links on scroll
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        
        // Get all sections
        const sections = document.querySelectorAll('section');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active class from all links
                navLinks.forEach(link => {
                    link.classList.remove('active');
                });
                
                // Add active class to current section link
                const activeLink = document.querySelector(`nav a[href="#${sectionId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    });
    
    // Add animation to skill bars
    const skillSection = document.querySelector('.skills');
    const skillLevels = document.querySelectorAll('.skill-level');
    
    // Function to check if an element is in viewport
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    // Function to animate skill bars when in viewport
    function animateSkillBars() {
        if (isInViewport(skillSection)) {
            skillLevels.forEach(skill => {
                skill.style.width = skill.style.width || '0%';
                skill.style.transition = 'width 1s ease-in-out';
            });
            
            // Remove scroll event after animation
            window.removeEventListener('scroll', animateSkillBars);
        }
    }
    
    // Add scroll event for skill animation
    window.addEventListener('scroll', animateSkillBars);
    
    // Trigger once on page load in case skills section is already visible
    animateSkillBars();
    
    // Add mobile navigation toggle
    const navToggle = document.createElement('div');
    navToggle.className = 'nav-toggle';
    navToggle.innerHTML = '<i class="fas fa-bars"></i>';
    
    const nav = document.querySelector('nav');
    nav.appendChild(navToggle);
    
    navToggle.addEventListener('click', function() {
        const navList = document.querySelector('nav ul');
        navList.classList.toggle('show');
    });
    
    // Add CSS for mobile navigation
    const style = document.createElement('style');
    style.textContent = `
        .nav-toggle {
            display: none;
            cursor: pointer;
            font-size: 1.5rem;
            padding: 15px;
            color: var(--primary-color);
        }
        
        @media (max-width: 768px) {
            nav ul {
                display: none;
            }
            
            nav ul.show {
                display: flex;
            }
            
            .nav-toggle {
                display: block;
                position: absolute;
                right: 20px;
                top: 10px;
            }
            
            nav {
                position: relative;
                padding: 10px 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add active class to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // Hide mobile menu after clicking
            const navList = document.querySelector('nav ul');
            navList.classList.remove('show');
        });
    });
});