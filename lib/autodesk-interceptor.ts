/**
 * Autodesk Revit Interceptor
 * 
 * Extracts material specifications and requirements from Revit models
 * using Autodesk Forge/APS (Autodesk Platform Services) APIs.
 * 
 * This interceptor:
 * 1. Authenticates with Autodesk Forge
 * 2. Uploads and translates Revit files to SVF format
 * 3. Extracts material properties and specifications
 * 4. Maps Revit materials to viability profile requirements
 */

import axios from 'axios';

/**
 * Autodesk Forge authentication response
 */
interface ForgeAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Revit material specification extracted from model
 */
export interface RevitMaterialSpec {
  /** Material name from Revit */
  materialName: string;
  /** Material class (e.g., Concrete, Steel, Insulation) */
  materialClass?: string;
  /** Manufacturer if specified in Revit */
  manufacturer?: string;
  /** Product name or model number */
  productName?: string;
  /** Required ASTM standards from specifications */
  requiredStandards?: string[];
  /** Performance requirements */
  performanceRequirements?: {
    fireRating?: string;
    thermalResistance?: number;
    compressiveStrength?: number;
    [key: string]: any;
  };
  /** Quantity needed */
  quantity?: number;
  /** Unit of measurement */
  unit?: string;
  /** Revit element IDs using this material */
  elementIds?: string[];
}

/**
 * Result from Revit model extraction
 */
export interface RevitExtractionResult {
  /** Model URN (unique identifier) */
  modelUrn: string;
  /** Extracted materials */
  materials: RevitMaterialSpec[];
  /** Model metadata */
  metadata?: {
    projectName?: string;
    projectNumber?: string;
    author?: string;
    created?: Date;
  };
  /** Extraction timestamp */
  extractedAt: Date;
}

/**
 * Get Autodesk Forge OAuth token
 */
async function getForgeToken(): Promise<string> {
  const clientId = process.env.AUTODESK_CLIENT_ID;
  const clientSecret = process.env.AUTODESK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Autodesk Forge credentials not configured (AUTODESK_CLIENT_ID, AUTODESK_CLIENT_SECRET)');
  }

  try {
    const response = await axios.post<ForgeAuthResponse>(
      'https://developer.api.autodesk.com/authentication/v1/authenticate',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'data:read data:write data:create bucket:read bucket:create',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('✅ Autodesk Forge authenticated');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Autodesk Forge authentication failed:', error);
    throw new Error('Failed to authenticate with Autodesk Forge');
  }
}

/**
 * Upload Revit file to Autodesk Forge
 * 
 * @param fileBuffer - Revit file buffer (.rvt)
 * @param fileName - File name
 * @returns Object URN for the uploaded file
 */
async function uploadRevitFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const token = await getForgeToken();
  const bucketKey = `greenchainz-${Date.now()}`.toLowerCase();

  try {
    // Create bucket
    await axios.post(
      `https://developer.api.autodesk.com/oss/v2/buckets`,
      {
        bucketKey,
        policyKey: 'transient', // Temporary storage (24 hours)
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Created bucket: ${bucketKey}`);

    // Upload file
    const uploadResponse = await axios.put(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}`,
      fileBuffer,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
      }
    );

    const objectId = uploadResponse.data.objectId;
    console.log(`✅ Uploaded file: ${objectId}`);

    // Convert to base64 URN
    const urn = Buffer.from(objectId).toString('base64').replace(/=/g, '');
    return urn;
  } catch (error) {
    console.error('❌ Failed to upload Revit file:', error);
    throw new Error('Failed to upload Revit file to Forge');
  }
}

/**
 * Translate Revit file to SVF format
 * 
 * @param urn - Object URN from upload
 * @returns Translation status
 */
async function translateRevitFile(urn: string): Promise<void> {
  const token = await getForgeToken();

  try {
    await axios.post(
      'https://developer.api.autodesk.com/modelderivative/v2/designdata/job',
      {
        input: {
          urn,
        },
        output: {
          formats: [
            {
              type: 'svf',
              views: ['2d', '3d'],
            },
          ],
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Translation job submitted');

    // Poll for completion (simplified - production should use webhooks)
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await axios.get(
        `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const status = statusResponse.data.status;
      console.log(`Translation status: ${status}`);

      if (status === 'success') {
        console.log('✅ Translation complete');
        return;
      } else if (status === 'failed') {
        throw new Error('Translation failed');
      }

      attempts++;
    }

    throw new Error('Translation timeout');
  } catch (error) {
    console.error('❌ Failed to translate Revit file:', error);
    throw new Error('Failed to translate Revit file');
  }
}

/**
 * Extract material properties from translated model
 * 
 * @param urn - Model URN
 * @returns Extracted material specifications
 */
async function extractMaterialProperties(urn: string): Promise<RevitMaterialSpec[]> {
  const token = await getForgeToken();

  try {
    // Get model metadata
    const metadataResponse = await axios.get(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/metadata`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const guid = metadataResponse.data.data.metadata[0].guid;

    // Get properties
    const propertiesResponse = await axios.get(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/metadata/${guid}/properties`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const objects = propertiesResponse.data.data.collection;

    // Extract materials from object properties
    const materialsMap = new Map<string, RevitMaterialSpec>();

    for (const obj of objects) {
      const props = obj.properties || {};
      
      // Look for material-related properties
      const materialProps = Object.keys(props).filter((key) =>
        key.toLowerCase().includes('material')
      );

      for (const propKey of materialProps) {
        const materialData = props[propKey];
        
        if (typeof materialData === 'object') {
          const materialName = materialData.displayName || materialData.name || 'Unknown';
          
          if (!materialsMap.has(materialName)) {
            const spec: RevitMaterialSpec = {
              materialName,
              materialClass: materialData.category || materialData.class,
              manufacturer: materialData.manufacturer,
              productName: materialData.model || materialData.productName,
              requiredStandards: extractStandards(materialData),
              performanceRequirements: extractPerformanceRequirements(materialData),
              elementIds: [obj.objectid],
            };
            
            materialsMap.set(materialName, spec);
          } else {
            // Add element ID to existing material
            const existing = materialsMap.get(materialName)!;
            existing.elementIds = existing.elementIds || [];
            existing.elementIds.push(obj.objectid);
          }
        }
      }
    }

    const materials = Array.from(materialsMap.values());
    console.log(`✅ Extracted ${materials.length} materials from model`);
    
    return materials;
  } catch (error) {
    console.error('❌ Failed to extract material properties:', error);
    throw new Error('Failed to extract material properties');
  }
}

/**
 * Extract ASTM standards from material data
 */
function extractStandards(materialData: any): string[] {
  const standards: string[] = [];
  
  // Look for standard-related properties
  const keys = Object.keys(materialData);
  
  for (const key of keys) {
    const value = String(materialData[key]);
    
    // Match ASTM patterns (e.g., ASTM E84, ASTM C518)
    const astmMatches = value.match(/ASTM\s+[A-Z]\d+/gi);
    if (astmMatches) {
      standards.push(...astmMatches);
    }
  }
  
  return [...new Set(standards)]; // Remove duplicates
}

/**
 * Extract performance requirements from material data
 */
function extractPerformanceRequirements(materialData: any): any {
  const requirements: any = {};
  
  // Fire rating
  if (materialData.fireRating || materialData.FireRating) {
    requirements.fireRating = materialData.fireRating || materialData.FireRating;
  }
  
  // Thermal resistance (R-value)
  if (materialData.thermalResistance || materialData.ThermalResistance) {
    requirements.thermalResistance = parseFloat(
      materialData.thermalResistance || materialData.ThermalResistance
    );
  }
  
  // Compressive strength
  if (materialData.compressiveStrength || materialData.CompressiveStrength) {
    requirements.compressiveStrength = parseFloat(
      materialData.compressiveStrength || materialData.CompressiveStrength
    );
  }
  
  return requirements;
}

/**
 * Main entry point: Extract specifications from Revit file
 * 
 * @param fileBuffer - Revit file buffer (.rvt)
 * @param fileName - File name
 * @returns Extraction result with materials
 */
export async function extractSpecsFromRevitModel(
  fileBuffer: Buffer,
  fileName: string
): Promise<RevitExtractionResult> {
  console.log(`🏗️ Starting Revit extraction for: ${fileName}`);

  try {
    // Upload file
    const urn = await uploadRevitFile(fileBuffer, fileName);

    // Translate to SVF
    await translateRevitFile(urn);

    // Extract materials
    const materials = await extractMaterialProperties(urn);

    const result: RevitExtractionResult = {
      modelUrn: urn,
      materials,
      extractedAt: new Date(),
    };

    console.log('✅ Revit extraction complete');
    return result;
  } catch (error) {
    console.error('❌ Revit extraction failed:', error);
    throw error;
  }
}

/**
 * Extract specs from Revit file URL
 * 
 * @param fileUrl - URL to Revit file
 * @returns Extraction result
 */
export async function extractSpecsFromRevitUrl(
  fileUrl: string
): Promise<RevitExtractionResult> {
  console.log(`🏗️ Downloading Revit file from: ${fileUrl}`);

  try {
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
    });

    const fileBuffer = Buffer.from(response.data);
    const fileName = fileUrl.split('/').pop() || 'model.rvt';

    return await extractSpecsFromRevitModel(fileBuffer, fileName);
  } catch (error) {
    console.error('❌ Failed to download or extract Revit file:', error);
    throw error;
  }
}

/**
 * Mock extraction for testing without Forge credentials
 */
export function mockRevitExtraction(fileName: string): RevitExtractionResult {
  console.log(`🧪 Mock Revit extraction for: ${fileName}`);

  return {
    modelUrn: 'mock-urn-' + Date.now(),
    materials: [
      {
        materialName: 'Carpet Tile',
        materialClass: 'Flooring',
        manufacturer: 'Interface',
        productName: 'Interface Urban Retreat',
        requiredStandards: ['ASTM E84'],
        performanceRequirements: {
          fireRating: 'Class I',
        },
        quantity: 5000,
        unit: 'sq ft',
        elementIds: ['elem-1', 'elem-2'],
      },
      {
        materialName: 'Mineral Wool Insulation',
        materialClass: 'Insulation',
        manufacturer: 'Rockwool',
        productName: 'ComfortBatt',
        requiredStandards: ['ASTM C518', 'ASTM E84'],
        performanceRequirements: {
          fireRating: 'Non-Combustible',
          thermalResistance: 15,
        },
        quantity: 10000,
        unit: 'sq ft',
        elementIds: ['elem-3', 'elem-4', 'elem-5'],
      },
    ],
    metadata: {
      projectName: 'Sample Commercial Building',
      projectNumber: 'PROJ-2024-001',
      author: 'John Architect',
      created: new Date(),
    },
    extractedAt: new Date(),
  };
}
