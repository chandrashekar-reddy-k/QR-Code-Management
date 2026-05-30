import { TextInput } from '../../../../../components/ui';

interface AddressSettingTabProps {
  formData: {
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    landmark: string;
    latitude: string;
    longitude: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const AddressSettingTab = ({ formData, onChange }: AddressSettingTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Address Line 1 */}
      <div>
        <TextInput
          label="Address Line 1"
          name="addressLine1"
          value={formData.addressLine1}
          onChange={onChange}
          placeholder="Enter address line 1"
          required
        />
      </div>

      {/* Address Line 2 */}
      <div>
        <TextInput
          label="Address Line 2"
          name="addressLine2"
          value={formData.addressLine2}
          onChange={onChange}
          placeholder="Enter address line 2"
        />
      </div>

      {/* City */}
      <div>
        <TextInput
          label="City"
          name="city"
          value={formData.city}
          onChange={onChange}
          placeholder="Enter city"
          required
        />
      </div>

      {/* State */}
      <div>
        <TextInput
          label="State"
          name="state"
          value={formData.state}
          onChange={onChange}
          placeholder="Enter state"
          required
        />
      </div>

      {/* Country */}
      <div>
        <TextInput
          label="Country"
          name="country"
          value={formData.country}
          onChange={onChange}
          placeholder="Enter country"
          required
        />
      </div>

      {/* Pincode */}
      <div>
        <TextInput
          label="Pincode"
          name="pincode"
          value={formData.pincode}
          onChange={onChange}
          placeholder="Enter pincode"
          required
        />
      </div>

      {/* Landmark */}
      <div>
        <TextInput
          label="Landmark"
          name="landmark"
          value={formData.landmark}
          onChange={onChange}
          placeholder="Enter landmark"
        />
      </div>

      {/* Latitude */}
      <div>
        <TextInput
          label="Latitude"
          name="latitude"
          value={formData.latitude}
          onChange={onChange}
          placeholder="Enter latitude"
        />
      </div>

      {/* Longitude */}
      <div>
        <TextInput
          label="Longitude"
          name="longitude"
          value={formData.longitude}
          onChange={onChange}
          placeholder="Enter longitude"
        />
      </div>
    </div>
  );
};

export default AddressSettingTab;

