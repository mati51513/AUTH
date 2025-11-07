// Advanced animations for the authentication system
document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    initAnimations();
    init3DTilt();
    
    // Add event listeners for animations
    addAnimationListeners();
});

// Initialize all animations
function initAnimations() {
    // Add fade-in animation to all cards
    const cards = document.querySelectorAll('.card, .glass-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s forwards`;
    });
    
    // Add pulse animation to badges
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        badge.classList.add('pulse-animation');
    });
    
    // Add hover animations to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.classList.add('btn-hover');
        });
        button.addEventListener('mouseleave', function() {
            this.classList.remove('btn-hover');
        });
    });
    
    // Spinning logo and preloader disabled for cleaner login UX

    // Staggered fade-in for login form fields
    const loginFields = document.querySelectorAll('.login-form .form-group');
    loginFields.forEach((field, idx) => {
        field.style.opacity = '0';
        field.style.transform = 'translateY(10px)';
        field.style.animation = `fadeInUp 0.4s ease-out ${idx * 0.08}s forwards`;
    });
}

// Add event listeners for animations
function addAnimationListeners() {
    // Add scroll animations
    window.addEventListener('scroll', function() {
        const scrollElements = document.querySelectorAll('.scroll-animate');
        scrollElements.forEach(element => {
            if (isElementInViewport(element)) {
                element.classList.add('in-view');
            }
        });
    });
    
    // Add click animations for buttons
    const actionButtons = document.querySelectorAll('.btn-primary, .btn-success, .btn-danger');
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Initialize spinning logo animation
function initSpinningLogo() {
    const logo = document.querySelector('.logo-spin');
    if (logo) {
        logo.innerHTML = `
            <div class="logo-container">
                <div class="gear-container">
                    <svg class="gear" viewBox="0 0 100 100">
                        <path class="gear-path" d="M50,20L54,28L62,26L60,34L68,36L64,44L72,48L66,54L72,60L64,64L68,72L60,74L62,82L54,80L50,88L46,80L38,82L40,74L32,72L36,64L28,60L34,54L28,48L36,44L32,36L40,34L38,26L46,28L50,20Z" />
                        <circle class="gear-center" cx="50" cy="50" r="8" />
                    </svg>
                </div>
                <div class="logo-text">Multi-Auth</div>
            </div>
        `;
    }
}

// Initialize preloader animation
function initPreloader() {
    // Use existing preloader if present, otherwise create one
    let preloader = document.querySelector('.preloader');
    if (!preloader) {
        preloader = document.createElement('div');
        preloader.className = 'preloader';
        preloader.innerHTML = `
            <div class="spinner">
                <div class="double-bounce1"></div>
                <div class="double-bounce2"></div>
            </div>
            <div class="loading-text">Loading...</div>
        `;
        document.body.appendChild(preloader);
    }

    const hidePreloader = () => {
        if (!preloader) return;
        preloader.classList.add('preloader-hide');
        setTimeout(() => {
            try { preloader.remove(); } catch (_) {}
        }, 500);
    };

    if (document.readyState === 'complete') {
        setTimeout(hidePreloader, 300);
    } else {
        window.addEventListener('load', () => setTimeout(hidePreloader, 300));
        // Safety timeout in case load never fires
        setTimeout(hidePreloader, 2000);
    }
}

// Check if element is in viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
        rect.bottom >= 0
    );
}

// Add notification animation
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <div class="notification-content">${message}</div>
        <div class="notification-close"><i class="fas fa-times"></i></div>
    `;
    
    // Add to notifications container or create one
    let notificationsContainer = document.querySelector('.notifications-container');
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.className = 'notifications-container';
        document.body.appendChild(notificationsContainer);
    }
    
    notificationsContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Export functions for use in other scripts
window.showNotification = showNotification;

// 3D tilt effect for login card
function init3DTilt() {
    const card = document.querySelector('.login-card-3d');
    const shine = document.querySelector('.card-shine');
    if (!card) return;

    const damp = 18; // controls tilt intensity
    const reset = () => {
        card.style.transform = `rotateX(0deg) rotateY(0deg)`;
        card.style.transition = 'transform 160ms ease-out';
        if (shine) shine.style.setProperty('--mx', '50%');
        if (shine) shine.style.setProperty('--my', '50%');
    };

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const rx = (-dy / damp).toFixed(2);
        const ry = (dx / damp).toFixed(2);
        card.style.transition = 'transform 40ms linear';
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        if (shine) {
            const mx = ((e.clientX - rect.left) / rect.width) * 100;
            const my = ((e.clientY - rect.top) / rect.height) * 100;
            shine.style.setProperty('--mx', `${mx}%`);
            shine.style.setProperty('--my', `${my}%`);
        }
    });

    card.addEventListener('mouseleave', reset);
    card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 120ms ease-out';
    });

    // Reset on window blur
    window.addEventListener('blur', reset);
}
