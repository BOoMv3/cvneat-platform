// Système de monitoring de sécurité

/**
 * Types d'événements de sécurité
 */
export const SECURITY_EVENTS = {
  LOGIN_ATTEMPT: 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT'
};

/**
 * Niveaux de risque
 */
export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Classe de monitoring de sécurité
 */
export class SecurityMonitor {
  constructor() {
    this.events = [];
    this.suspiciousIPs = new Set();
    this.failedAttempts = new Map();
    this.maxEvents = 1000; // Limite d'événements en mémoire
  }

  /**
   * Enregistrer un événement de sécurité
   */
  logEvent(type, details, riskLevel = RISK_LEVELS.LOW, ip = null) {
    const event = {
      id: this.generateEventId(),
      type,
      details: this.sanitizeDetails(details),
      riskLevel,
      ip: this.maskIP(ip),
      timestamp: new Date().toISOString(),
      userAgent: details.userAgent || null
    };

    this.events.unshift(event);
    
    // Maintenir la limite d'événements
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Traitement spécial selon le type d'événement
    this.handleEvent(event);

    // Log en console (à remplacer par un service de logging en production)
    console.log(`🔒 Security Event [${riskLevel}]:`, {
      type: event.type,
      ip: event.ip,
      timestamp: event.timestamp
    });
  }

  /**
   * Gérer les événements spéciaux
   */
  handleEvent(event) {
    switch (event.type) {
      case SECURITY_EVENTS.LOGIN_FAILED:
        this.handleFailedLogin(event);
        break;
      case SECURITY_EVENTS.RATE_LIMIT_EXCEEDED:
        this.handleRateLimitExceeded(event);
        break;
      case SECURITY_EVENTS.SUSPICIOUS_ACTIVITY:
        this.handleSuspiciousActivity(event);
        break;
    }
  }

  /**
   * Gérer les échecs de connexion
   */
  handleFailedLogin(event) {
    const ip = event.ip;
    if (!ip) return;

    const attempts = this.failedAttempts.get(ip) || 0;
    this.failedAttempts.set(ip, attempts + 1);

    // Marquer comme suspect après 5 tentatives
    if (attempts >= 4) {
      this.suspiciousIPs.add(ip);
      this.logEvent(
        SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
        { reason: 'Multiple failed login attempts', ip },
        RISK_LEVELS.HIGH,
        ip
      );
    }
  }

  /**
   * Gérer les dépassements de rate limit
   */
  handleRateLimitExceeded(event) {
    const ip = event.ip;
    if (!ip) return;

    this.suspiciousIPs.add(ip);
    this.logEvent(
      SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      { reason: 'Rate limit exceeded', ip },
      RISK_LEVELS.MEDIUM,
      ip
    );
  }

  /**
   * Gérer les activités suspectes
   */
  handleSuspiciousActivity(event) {
    // Ici on pourrait implémenter des actions automatiques
    // comme bloquer temporairement l'IP, envoyer des alertes, etc.
    console.warn('🚨 Suspicious activity detected:', event);
  }

  /**
   * Vérifier si une IP est suspecte
   */
  isSuspiciousIP(ip) {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Obtenir les statistiques de sécurité
   */
  getSecurityStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) > last24h
    );

    const stats = {
      totalEvents: this.events.length,
      eventsLast24h: recentEvents.length,
      suspiciousIPs: this.suspiciousIPs.size,
      failedAttempts: Array.from(this.failedAttempts.entries()),
      eventsByType: this.groupEventsByType(recentEvents),
      eventsByRiskLevel: this.groupEventsByRiskLevel(recentEvents)
    };

    return stats;
  }

  /**
   * Grouper les événements par type
   */
  groupEventsByType(events) {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Grouper les événements par niveau de risque
   */
  groupEventsByRiskLevel(events) {
    return events.reduce((acc, event) => {
      acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Sanitiser les détails de l'événement
   */
  sanitizeDetails(details) {
    if (!details || typeof details !== 'object') return details;

    const sanitized = { ...details };
    
    // Supprimer les données sensibles
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Masquer l'IP pour la confidentialité
   */
  maskIP(ip) {
    if (!ip) return null;
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return ip;
  }

  /**
   * Générer un ID d'événement unique
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Nettoyer les anciens événements
   */
  cleanup() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours
    this.events = this.events.filter(
      event => new Date(event.timestamp) > cutoff
    );
  }
}

// Instance globale du moniteur de sécurité
export const securityMonitor = new SecurityMonitor();

// Fonctions utilitaires pour les événements courants
export const logSecurityEvent = (type, details, riskLevel, ip) => {
  securityMonitor.logEvent(type, details, riskLevel, ip);
};

export const isIPBlocked = (ip) => {
  return securityMonitor.isSuspiciousIP(ip);
};

export const getSecurityStats = () => {
  return securityMonitor.getSecurityStats();
};
