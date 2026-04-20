import React, { useMemo, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { Book } from '../types';
import { createBookTexture, createSpineTexture } from '../utils/textureGenerator';

// Fix for missing JSX types by using explicit constants treated as components
// This bypasses the need for global JSX namespace augmentation which was failing
const Mesh = 'mesh' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;

interface Book3DProps {
  book: Book;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const Book3D: React.FC<Book3DProps> = ({ book, position, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const { viewport } = useThree();

  // Create textures only once
  const { coverMap, spineMap } = useMemo(() => {
    return {
      coverMap: createBookTexture(book.title, book.color),
      spineMap: createSpineTexture(book.title, book.color, 50, 360)
    };
  }, [book.title, book.color]);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      coverMap?.dispose();
      spineMap?.dispose();
    };
  }, [coverMap, spineMap]);

  // Spring animations for position and rotation
  const { pos, rot, scale } = useSpring({
    pos: isSelected 
      ? [0, 0, 2] // Move to center front when selected
      : hovered 
        ? [position[0], position[1], position[2] + 0.2] // Pop out slightly on hover
        : position,
    rot: isSelected 
      ? [0, 0, 0] // Face flat forward
      : [0, 0, 0], // Normal shelf rotation
    scale: isSelected ? 1.2 : 1,
    config: { mass: 1, tension: 170, friction: 26 }
  });

  // Calculate geometry dimensions
  const width = 0.8;
  const height = book.height || 1.1;
  const depth = book.thickness || 0.15;

  return (
    <animated.group 
      position={pos as any} 
      rotation={rot as any}
      scale={scale as any}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(book.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <Mesh castShadow receiveShadow>
        <BoxGeometry args={[width, height, depth]} />
        {/* Material order: right, left, top, bottom, front, back */}
        {/* We map textures to front (cover) and left (spine) assuming book placement */}
        <MeshStandardMaterial color="#fff" attach="material-0" /> {/* Pages (Right) */}
        <MeshStandardMaterial map={spineMap} attach="material-1" /> {/* Spine (Left) */}
        <MeshStandardMaterial color={book.color} attach="material-2" /> {/* Top */}
        <MeshStandardMaterial color={book.color} attach="material-3" /> {/* Bottom */}
        <MeshStandardMaterial map={coverMap} attach="material-4" /> {/* Cover (Front) */}
        <MeshStandardMaterial color={book.color} attach="material-5" /> {/* Back */}
      </Mesh>
    </animated.group>
  );
};