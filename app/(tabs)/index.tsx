import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const COIN_SIZE = width * 0.45;
const PARTICLE_COUNT = 12;

type CoinResult = 'heads' | 'tails' | null;

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
}

// Particle component to avoid hooks in loops
function ParticleComponent({ 
  particle, 
  particleScale, 
  radian 
}: { 
  particle: Particle; 
  particleScale: SharedValue<number>; 
  radian: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = interpolate(particleScale.value, [0, 1], [0, 120]);
    const opacity = interpolate(particleScale.value, [0, 0.5, 1], [0, 1, 0]);
    const scale = interpolate(particleScale.value, [0, 0.3, 1], [0, 1, 0.5]);
    
    const x = Math.cos(radian) * distance;
    const y = Math.sin(radian) * distance;
    
    return {
      opacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: particle.color },
        animatedStyle,
      ]}
    />
  );
}

export default function CoinTossScreen() {
  const [result, setResult] = useState<CoinResult>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [stats, setStats] = useState({ heads: 0, tails: 0 });
  const [streak, setStreak] = useState({ type: null as CoinResult, count: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showParticles, setShowParticles] = useState(false);
  
  const rotation = useSharedValue(0);
  const rotationX = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const glow = useSharedValue(0);
  const bgPulse = useSharedValue(0);
  const particleScale = useSharedValue(0);
  
  // Background animation
  useEffect(() => {
    bgPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const tossCoin = () => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    setResult(null);
    setShowParticles(false);
    
    // Haptic feedback on start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Random result
    const isHeads = Math.random() < 0.5;
    const finalRotation = isHeads ? 0 : 180;
    const spins = 6 + Math.floor(Math.random() * 4); // 6-9 spins
    
    // Create particles
    const newParticles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: 0,
      y: 0,
      angle: (360 / PARTICLE_COUNT) * i,
      color: isHeads ? '#FFD700' : '#FF1493',
    }));
    setParticles(newParticles);
    
    // Animate coin flip with 3D rotation
    rotation.value = withSequence(
      withTiming(360 * spins + finalRotation, {
        duration: 2500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
    
    rotationX.value = withSequence(
      withTiming(720, {
        duration: 2500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(0, { duration: 0 })
    );
    
    scale.value = withSequence(
      withTiming(1.3, { duration: 200, easing: Easing.out(Easing.ease) }),
      withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      withSpring(1.1, { damping: 3 }),
      withSpring(1, { damping: 5 })
    );
    
    translateY.value = withSequence(
      withTiming(-100, { duration: 800, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 1700, easing: Easing.bounce })
    );
    
    glow.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(2000, withTiming(0, { duration: 300 }))
    );
    
    // Set result after animation
    setTimeout(() => {
      const newResult = isHeads ? 'heads' : 'tails';
      setResult(newResult);
      setStats(prev => ({
        ...prev,
        [newResult]: prev[newResult] + 1,
      }));
      
      // Update streak
      setStreak(prev => {
        if (prev.type === newResult) {
          return { type: newResult, count: prev.count + 1 };
        }
        return { type: newResult, count: 1 };
      });
      
      setIsFlipping(false);
      setShowParticles(true);
      
      // Animate particles
      particleScale.value = 0;
      particleScale.value = withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.back(2)) }),
        withDelay(1000, withTiming(0, { duration: 300 }))
      );
      
      // Haptic feedback on land
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Hide particles after animation
      setTimeout(() => setShowParticles(false), 1700);
    }, 2500);
  };

  const resetStats = () => {
    setStats({ heads: 0, tails: 0 });
    setStreak({ type: null, count: 0 });
    setResult(null);
    rotation.value = withSpring(0);
    rotationX.value = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const animatedCoinStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      rotation.value,
      [0, 180, 360],
      [0, 180, 360]
    );
    
    const rotateXDeg = interpolate(
      rotationX.value,
      [0, 360, 720],
      [0, 360, 720]
    );
    
    return {
      transform: [
        { perspective: 1200 },
        { rotateX: `${rotateXDeg}deg` },
        { rotateY: `${rotateY}deg` },
        { scale: scale.value },
        { translateY: translateY.value },
      ],
    };
  });

  const animatedFrontStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      rotation.value % 360,
      [0, 90, 180, 270, 360],
      [1, 0, 0, 0, 1]
    );
    
    return { opacity };
  });

  const animatedBackStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      rotation.value % 360,
      [0, 90, 180, 270, 360],
      [0, 0, 1, 0, 0]
    );
    
    return { opacity };
  });
  
  const animatedGlowStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(glow.value, [0, 1], [0, 0.8]);
    const glowScale = interpolate(glow.value, [0, 1], [1, 1.4]);
    
    return {
      opacity: glowOpacity,
      transform: [{ scale: glowScale }],
    };
  });
  
  const animatedBgStyle = useAnimatedStyle(() => {
    const color1 = interpolate(bgPulse.value, [0, 1], [0, 30]);
    
    return {
      backgroundColor: `rgb(${40 + color1}, ${30 + color1}, ${80 + color1})`,
    };
  });

  const total = stats.heads + stats.tails;
  const headsPercent = total > 0 ? ((stats.heads / total) * 100).toFixed(1) : 0;
  const tailsPercent = total > 0 ? ((stats.tails / total) * 100).toFixed(1) : 0;

  return (
    <Animated.View style={[styles.container, animatedBgStyle]}>
      {/* Neon Grid Background */}
      <View style={styles.gridOverlay} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>⚡ COIN FLIP ⚡</Text>
          <Text style={styles.subtitle}>NEON EDITION</Text>
        </View>
        <TouchableOpacity onPress={resetStats} style={styles.resetButton}>
          <Text style={styles.resetText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Streak Display */}
      {streak.count > 2 && (
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>
            🔥 {streak.count}x {streak.type?.toUpperCase()} STREAK! 🔥
          </Text>
        </View>
      )}

      {/* Coin Container */}
      <View style={styles.coinContainer}>
        {/* Glow Effect */}
        <Animated.View style={[styles.coinGlow, animatedGlowStyle]} />
        
        <Animated.View style={[styles.coin, animatedCoinStyle]}>
          {/* Heads Side */}
          <Animated.View style={[styles.coinFace, styles.heads, animatedFrontStyle]}>
            <View style={styles.coinInner}>
              <Text style={styles.coinEmoji}>👑</Text>
              <Text style={styles.coinText}>HEADS</Text>
              <View style={styles.neonBorder} />
            </View>
          </Animated.View>
          
          {/* Tails Side */}
          <Animated.View style={[styles.coinFace, styles.tails, styles.tailsRotation, animatedBackStyle]}>
            <View style={styles.coinInner}>
              <Text style={styles.coinEmoji}>⚡</Text>
              <Text style={styles.coinText}>TAILS</Text>
              <View style={styles.neonBorder} />
            </View>
          </Animated.View>
        </Animated.View>
        
        {/* Particles */}
        {showParticles && particles.map((particle) => {
          const radian = (particle.angle * Math.PI) / 180;
          return (
            <ParticleComponent
              key={particle.id}
              particle={particle}
              particleScale={particleScale}
              radian={radian}
            />
          );
        })}
      </View>

      {/* Result Display */}
      {result && !isFlipping && (
        <View style={[styles.resultContainer, result === 'heads' ? styles.resultHeads : styles.resultTails]}>
          <Text style={styles.resultText}>
            {result === 'heads' ? '👑 HEADS!' : '⚡ TAILS!'}
          </Text>
        </View>
      )}

      {/* Toss Button */}
      <TouchableOpacity
        style={[styles.tossButton, isFlipping && styles.tossButtonDisabled]}
        onPress={tossCoin}
        disabled={isFlipping}
        activeOpacity={0.8}
      >
        <View style={styles.buttonGlow} />
        <Text style={styles.tossButtonText}>
          {isFlipping ? '⚡ FLIPPING ⚡' : '▶ FLIP COIN'}
        </Text>
      </TouchableOpacity>

      {/* Statistics Panel */}
      <View style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>⚡ STATS ⚡</Text>
          <Text style={styles.totalText}>{total} FLIPS</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>👑</Text>
            <Text style={styles.statNumber}>{stats.heads}</Text>
            <Text style={styles.statLabel}>HEADS</Text>
            
            {/* Progress Bar */}
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  styles.progressHeads,
                  { width: headsPercent + '%' as any }
                ]} 
              />
            </View>
            <Text style={styles.statPercent}>{headsPercent}%</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={styles.statNumber}>{stats.tails}</Text>
            <Text style={styles.statLabel}>TAILS</Text>
            
            {/* Progress Bar */}
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  styles.progressTails,
                  { width: tailsPercent + '%' as any }
                ]} 
              />
            </View>
            <Text style={styles.statPercent}>{tailsPercent}%</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00ff9f',
    textShadowColor: '#00ff9f',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff0080',
    letterSpacing: 4,
    marginTop: 2,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 0, 128, 0.2)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff0080',
    shadowColor: '#ff0080',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  resetText: {
    color: '#ff0080',
    fontWeight: '900',
    fontSize: 28,
  },
  streakContainer: {
    backgroundColor: 'rgba(255, 100, 0, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#ff6400',
    shadowColor: '#ff6400',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
  },
  coinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  coinGlow: {
    position: 'absolute',
    width: COIN_SIZE * 1.5,
    height: COIN_SIZE * 1.5,
    borderRadius: (COIN_SIZE * 1.5) / 2,
    backgroundColor: '#00ff9f',
    shadowColor: '#00ff9f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
  },
  coin: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    position: 'relative',
  },
  coinFace: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coinInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heads: {
    backgroundColor: '#1a1a2e',
  },
  tails: {
    backgroundColor: '#16213e',
  },
  tailsRotation: {
    transform: [{ rotateY: '180deg' }],
  },
  neonBorder: {
    position: 'absolute',
    width: COIN_SIZE - 8,
    height: COIN_SIZE - 8,
    borderRadius: (COIN_SIZE - 8) / 2,
    borderWidth: 4,
    borderColor: '#00ff9f',
    shadowColor: '#00ff9f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  coinEmoji: {
    fontSize: 80,
    marginBottom: 5,
  },
  coinText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00ff9f',
    letterSpacing: 4,
    textShadowColor: '#00ff9f',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  particle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#00ff9f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  resultContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 3,
  },
  resultHeads: {
    backgroundColor: 'rgba(0, 255, 159, 0.1)',
    borderColor: '#00ff9f',
    shadowColor: '#00ff9f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  resultTails: {
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    borderColor: '#ff0080',
    shadowColor: '#ff0080',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  resultText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  tossButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 30,
    alignSelf: 'center',
    marginVertical: 15,
    borderWidth: 3,
    borderColor: '#00ff9f',
    shadowColor: '#00ff9f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 159, 0.2)',
  },
  tossButtonDisabled: {
    opacity: 0.5,
  },
  tossButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00ff9f',
    letterSpacing: 3,
    textShadowColor: '#00ff9f',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  statsContainer: {
    backgroundColor: 'rgba(15, 52, 96, 0.4)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00ff9f',
    shadowColor: '#00ff9f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00ff9f',
    letterSpacing: 2,
  },
  totalText: {
    fontSize: 14,
    color: '#ff0080',
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#00ff9f',
  },
  statEmoji: {
    fontSize: 36,
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00ff9f',
    textShadowColor: '#00ff9f',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
    fontWeight: '700',
    letterSpacing: 2,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHeads: {
    backgroundColor: '#00ff9f',
    shadowColor: '#00ff9f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  progressTails: {
    backgroundColor: '#ff0080',
    shadowColor: '#ff0080',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  statPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 5,
  },
});
