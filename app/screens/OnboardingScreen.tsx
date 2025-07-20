import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import i18n from '../i18n/translations';

const { width } = Dimensions.get('window');

const slides = [
  {
    title: i18n.t('title1'),
    desc: i18n.t('desc1'),
    image: require('./onboarding1.png'),
  },
  {
    title: i18n.t('title2'),
    desc: i18n.t('desc2'),
    image: require('./onboarding1.png'),
  },
  {
    title: i18n.t('title3'),
    desc: i18n.t('desc3'),
    image: require('./onboarding1.png'),
  },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  const nextStep = () => {
    if (step === slides.length - 1) {
      onDone(); // continuar con la app
    } else {
      setStep(step + 1);
    }
  };

  const { title, desc, image } = slides[step];

  return (
    <View style={styles.container}>
      <Image source={image} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{desc}</Text>

      <TouchableOpacity style={styles.button} onPress={nextStep}>
        <Text style={styles.buttonText}>
          {step === slides.length - 1 ? i18n.t('start') : '→'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    padding: 20,
  },
  image: {
    width: width * 0.8,
    height: 250,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#222',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
