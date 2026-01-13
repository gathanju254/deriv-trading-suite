// frontend/src/components/Common/LoadingSpinner/LoadingSpinner.jsx
import React from 'react';
import { Loader2, Zap, TrendingUp, Brain, Shield, Sparkles } from 'lucide-react';

const LoadingSpinner = ({ 
  // Basic props
  size = 'medium',
  text = 'Loading...',
  type = 'standard',
  theme = 'blue',
  
  // Advanced props
  fullScreen = false,
  transparent = false,
  showPercentage = false,
  currentProgress = null,
  
  // Customization
  icon = null,
  showIcon = true,
  pulsating = true,
  gradient = true,
  
  // Additional text
  subText = null,
  estimatedTime = null,
  
  // Animation
  speed = 'normal',
  spinnerLines = 8,
  showProgressRing = false,
  progressRingSize = 'default',
  
  // Style overrides
  className = '',
  textClassName = '',
  spinnerClassName = '',
  iconClassName = '',
}) => {
  // Size mappings
  const sizeClasses = {
    tiny: { container: 'p-1', spinner: 'w-4 h-4', text: 'text-xs', icon: 'w-3 h-3', progress: 'w-3 h-3' },
    small: { container: 'p-2', spinner: 'w-6 h-6', text: 'text-sm', icon: 'w-4 h-4', progress: 'w-4 h-4' },
    medium: { container: 'p-3', spinner: 'w-8 h-8', text: 'text-base', icon: 'w-5 h-5', progress: 'w-5 h-5' },
    large: { container: 'p-4', spinner: 'w-12 h-12', text: 'text-lg', icon: 'w-6 h-6', progress: 'w-6 h-6' },
    xl: { container: 'p-6', spinner: 'w-16 h-16', text: 'text-xl', icon: 'w-8 h-8', progress: 'w-8 h-8' },
  };

  // Theme color mappings
  const themeColors = {
    blue: { primary: 'blue', secondary: 'cyan' },
    green: { primary: 'emerald', secondary: 'green' },
    purple: { primary: 'purple', secondary: 'violet' },
    orange: { primary: 'orange', secondary: 'amber' },
    pink: { primary: 'pink', secondary: 'rose' },
    gray: { primary: 'gray', secondary: 'slate' },
  };

  // Type configurations
  const typeConfigs = {
    standard: { icon: Loader2, animation: 'spin', lines: spinnerLines },
    trading: { icon: TrendingUp, animation: 'spin', lines: 4 },
    intelligent: { icon: Brain, animation: 'spin-slow', lines: 6 },
    secure: { icon: Shield, animation: 'pulse-spin', lines: 8 },
    premium: { icon: Sparkles, animation: 'pulse', lines: 12 },
    custom: { icon: icon || Zap, animation: 'spin', lines: spinnerLines },
  };

  // Animation speed
  const animationSpeed = {
    slow: 'animate-[spin_1.5s_linear_infinite]',
    normal: 'animate-[spin_1s_linear_infinite]',
    fast: 'animate-[spin_0.5s_linear_infinite]',
  };

  // Get current config
  const config = sizeClasses[size] || sizeClasses.medium;
  const themeConfig = themeColors[theme] || themeColors.blue;
  const typeConfig = typeConfigs[type] || typeConfigs.standard;
  const IconComponent = typeConfig.icon;
  
  // Calculate percentage display
  const percentageValue = currentProgress !== null 
    ? Math.min(100, Math.max(0, currentProgress))
    : null;
  
  // Main spinner render
  const renderSpinner = () => {
    const baseClasses = `inline-block ${config.spinner} ${spinnerClassName}`;
    const animationClass = animationSpeed[speed] || animationSpeed.normal;
    
    switch (type) {
      case 'standard':
        return (
          <div className={`${baseClasses} ${animationClass}`}>
            <div className={`w-full h-full rounded-full border-2 border-transparent border-t-${themeConfig.primary}-500 ${gradient ? `border-t-${themeConfig.secondary}-400` : ''}`} />
          </div>
        );
      
      case 'trading':
        return (
          <div className={`${baseClasses} relative ${animationClass}`}>
            <div className={`absolute inset-0 rounded-full border-2 border-${themeConfig.primary}-500/30`} />
            <div className="absolute inset-2 rounded-full border-t-2 border-r-2 border-transparent border-t-white border-r-white animate-pulse" />
            <IconComponent className={`w-full h-full text-${themeConfig.primary}-500 ${pulsating ? 'animate-pulse' : ''}`} />
          </div>
        );
      
      case 'intelligent':
        return (
          <div className={`${baseClasses} relative ${animationClass}`}>
            {Array.from({ length: typeConfig.lines }).map((_, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1/2 bg-gradient-to-b from-${themeConfig.primary}-500 to-${themeConfig.secondary}-500 origin-bottom`}
                style={{
                  transform: `rotate(${i * (360 / typeConfig.lines)}deg)`,
                  animation: `pulse ${1 + i * 0.1}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        );
      
      case 'secure':
        return (
          <div className={`${baseClasses} relative ${animationSpeed.normal}`}>
            <div className={`absolute inset-0 rounded-full border-2 border-${themeConfig.primary}-500 border-dashed`} />
            <div className={`absolute inset-2 rounded-full border-2 border-${themeConfig.secondary}-500 animate-ping`} />
            <IconComponent className={`absolute inset-1/4 w-1/2 h-1/2 text-${themeConfig.primary}-500`} />
          </div>
        );
      
      case 'premium':
        return (
          <div className={`${baseClasses} relative ${animationSpeed.slow}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full animate-spin" />
            <div className="absolute inset-1 bg-gradient-to-br from-gray-900 to-gray-950 rounded-full" />
            <IconComponent className="absolute inset-1/4 w-1/2 h-1/2 text-white animate-pulse" />
          </div>
        );
      
      default:
        return (
          <div className={`${baseClasses} ${animationClass}`}>
            <div className={`w-full h-full rounded-full border-2 border-transparent border-t-${themeConfig.primary}-500 ${gradient ? `border-t-${themeConfig.secondary}-400` : ''}`} />
          </div>
        );
    }
  };

  // Progress ring render
  const renderProgressRing = () => {
    if (!showProgressRing && percentageValue === null) return null;
    
    const progressValue = percentageValue || 0;
    const circumference = 2 * Math.PI * 20;
    const strokeDashoffset = circumference - (progressValue / 100) * circumference;
    
    return (
      <div className={`relative ${config.progress}`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
          <circle
            className="text-gray-700"
            strokeWidth="3"
            stroke="currentColor"
            fill="transparent"
            r="20"
            cx="25"
            cy="25"
          />
          <circle
            className={`text-${themeConfig.primary}-500 transition-all duration-300 ease-out`}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="20"
            cx="25"
            cy="25"
          />
        </svg>
        {showPercentage && (
          <span className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-${themeConfig.primary}-500`}>
            {progressValue}%
          </span>
        )}
      </div>
    );
  };

  // Container classes
  const containerBaseClasses = `
    flex flex-col items-center justify-center
    ${transparent ? 'bg-transparent' : 'bg-gray-900/30 backdrop-blur-sm'}
    rounded-2xl transition-all duration-300
    ${fullScreen ? 'fixed inset-0 z-50' : 'inline-flex'}
    ${className}
  `;

  // If fullScreen mode, render full overlay
  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${transparent ? 'bg-transparent' : 'bg-gray-950/80 backdrop-blur-md'}`}>
        <div className={containerBaseClasses}>
          <div className={`flex flex-col items-center justify-center gap-4 ${config.container}`}>
            {/* Main spinner */}
            {renderSpinner()}
            
            {/* Icon if enabled */}
            {showIcon && type !== 'premium' && (
              <IconComponent className={`${config.icon} text-${themeConfig.primary}-500 ${iconClassName} ${pulsating ? 'animate-pulse' : ''}`} />
            )}
            
            {/* Progress ring if enabled */}
            {renderProgressRing()}
            
            {/* Main text */}
            <div className="flex flex-col items-center gap-2">
              <span className={`font-semibold ${config.text} ${textClassName} text-white`}>
                {text}
              </span>
              
              {/* Subtext if provided */}
              {subText && (
                <span className="text-sm text-gray-400 max-w-xs text-center">
                  {subText}
                </span>
              )}
              
              {/* Estimated time if provided */}
              {estimatedTime && (
                <span className="text-xs text-gray-500">
                  Estimated: {estimatedTime}
                </span>
              )}
            </div>
            
            {/* Loading dots animation */}
            <div className="flex gap-1 mt-2">
              {[0, 1, 2].map((dot) => (
                <div
                  key={dot}
                  className={`w-2 h-2 rounded-full bg-${themeConfig.primary}-500 animate-bounce`}
                  style={{ animationDelay: `${dot * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular inline spinner
  return (
    <div className={`inline-flex flex-col items-center justify-center ${config.container} ${containerBaseClasses}`}>
      <div className="relative">
        {/* Main spinner */}
        {renderSpinner()}
        
        {/* Icon overlay for certain types */}
        {showIcon && type === 'trading' && (
          <div className={`absolute inset-0 flex items-center justify-center ${iconClassName}`}>
            <IconComponent className={`w-1/2 h-1/2 text-white ${pulsating ? 'animate-pulse' : ''}`} />
          </div>
        )}
        
        {/* Progress ring overlay */}
        {showProgressRing && (
          <div className="absolute inset-0">
            {renderProgressRing()}
          </div>
        )}
      </div>
      
      {/* Text content */}
      <div className="mt-2 text-center">
        <span className={`font-medium ${config.text} ${textClassName} text-gray-200`}>
          {text}
        </span>
        
        {/* Percentage display */}
        {showPercentage && percentageValue !== null && (
          <div className="mt-1 flex items-center justify-center gap-2">
            <div className={`w-full max-w-[100px] h-1 bg-gray-700 rounded-full overflow-hidden`}>
              <div
                className={`h-full bg-gradient-to-r from-${themeConfig.primary}-500 to-${themeConfig.secondary}-500 transition-all duration-500 ease-out`}
                style={{ width: `${percentageValue}%` }}
              />
            </div>
            <span className={`text-xs font-bold text-${themeConfig.primary}-500`}>
              {percentageValue}%
            </span>
          </div>
        )}
        
        {/* Subtext */}
        {subText && (
          <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
            {subText}
          </p>
        )}
      </div>
    </div>
  );
};

// Default props for convenience
LoadingSpinner.defaultProps = {
  size: 'medium',
  text: 'Loading...',
  type: 'standard',
  theme: 'blue',
  fullScreen: false,
  transparent: false,
  showPercentage: false,
  currentProgress: null,
  icon: null,
  showIcon: true,
  pulsating: true,
  gradient: true,
  subText: null,
  estimatedTime: null,
  speed: 'normal',
  spinnerLines: 8,
  showProgressRing: false,
  progressRingSize: 'default',
  className: '',
  textClassName: '',
  spinnerClassName: '',
  iconClassName: '',
};

export default LoadingSpinner;