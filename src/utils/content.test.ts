import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Content Collection Schema Validation', () => {
  // Auto Collection Schema
  const autoSchema = z.object({
    id: z.string(),
    name: z.string(),
    year: z.string(),
    type: z.string(),
    specs: z.record(z.string(), z.string())
  });

  describe('Auto Collection', () => {
    it('should validate correct auto entry', () => {
      const validEntry = {
        id: 'tesla-model-3',
        name: 'Tesla Model 3',
        year: '2023',
        type: 'EV',
        specs: { horsepower: '350', range: '300mi' }
      };
      
      expect(() => autoSchema.parse(validEntry)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidEntry = {
        id: 'tesla-model-3',
        name: 'Tesla Model 3'
        // missing year, type, specs
      };
      
      expect(() => autoSchema.parse(invalidEntry)).toThrow();
    });

    it('should validate specs as record of strings', () => {
      const validEntry = {
        id: 'test-car',
        name: 'Test Car',
        year: '2024',
        type: 'Performance',
        specs: { 
          horsepower: '400',
          torque: '450 lb-ft',
          acceleration: '3.5s'
        }
      };
      
      expect(() => autoSchema.parse(validEntry)).not.toThrow();
    });
  });

  // Pro Collection - Role Schema
  const roleSchema = z.object({
    type: z.literal('role'),
    id: z.string(),
    title: z.string(),
    company: z.string(),
    duration: z.string(),
    description: z.string(),
    highlights: z.array(z.string())
  });

  describe('Pro Collection - Role Type', () => {
    it('should validate correct role entry', () => {
      const validRole = {
        type: 'role' as const,
        id: 'arch-lead',
        title: 'Enterprise Architect',
        company: 'Tech Corp',
        duration: '2021-2024',
        description: 'Led cloud migration',
        highlights: ['AWS deployment', 'Team leadership']
      };
      
      expect(() => roleSchema.parse(validRole)).not.toThrow();
    });

    it('should require highlights as array', () => {
      const invalidRole = {
        type: 'role' as const,
        id: 'arch-lead',
        title: 'Enterprise Architect',
        company: 'Tech Corp',
        duration: '2021-2024',
        description: 'Led cloud migration',
        highlights: 'AWS deployment' as any
      };
      
      expect(() => roleSchema.parse(invalidRole)).toThrow();
    });

    it('should enforce type literal "role"', () => {
      const invalidRole = {
        type: 'position',
        id: 'arch-lead',
        title: 'Enterprise Architect',
        company: 'Tech Corp',
        duration: '2021-2024',
        description: 'Led cloud migration',
        highlights: []
      };
      
      expect(() => roleSchema.parse(invalidRole)).toThrow();
    });
  });
});
