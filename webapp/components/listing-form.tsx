"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMatchmaking } from "@/contexts/matchmaking-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import AddressAutoComplete, { AddressType } from "./address-autocomplete";
import { DialogFooter } from "./ui/dialog";

const listingFormSchema = z.object({
  itemDescription: z
    .string()
    .min(5, {
      message: "Description must be at least 5 characters.",
    })
    .max(200, {
      message: "Description must not be longer than 200 characters.",
    }),
  itemPrice: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "Price must be a valid number.",
    })
    .refine((val) => Number(val) >= 0, {
      message: "Price must be a positive number.",
    }),
  maxFee: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "Fee must be a valid number.",
    })
    .refine((val) => Number(val) >= 0, {
      message: "Fee must be a positive number.",
    }),
  pickupAddress: z.string().min(5, {
    message: "Pickup address must be at least 5 characters.",
  }),
  deliveryAddress: z.string().min(5, {
    message: "Delivery address must be at least 5 characters.",
  }),
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

export function ListingForm({
  onClose,
  onSubmitSuccess,
}: {
  onClose: () => void;
  onSubmitSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setCurrentListing } = useMatchmaking();

  // State for address autocomplete
  const [pickupAddress, setPickupAddress] = useState<AddressType>({
    address1: "",
    address2: "",
    formattedAddress: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    lat: 0,
    lng: 0,
  });

  const [deliveryAddress, setDeliveryAddress] = useState<AddressType>({
    address1: "",
    address2: "",
    formattedAddress: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    lat: 0,
    lng: 0,
  });

  const [pickupSearchInput, setPickupSearchInput] = useState("");
  const [deliverySearchInput, setDeliverySearchInput] = useState("");

  // Default values for the form
  const defaultValues: Partial<ListingFormValues> = {
    itemDescription: "",
    itemPrice: "",
    maxFee: "",
    pickupAddress: "",
    deliveryAddress: "",
  };

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues,
  });

  // Handle pickup address change
  const handlePickupAddressChange = (address: AddressType) => {
    setPickupAddress(address);

    // Update the form value with the formatted address
    if (address.formattedAddress) {
      form.setValue("pickupAddress", address.formattedAddress, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      console.log("Pickup place selected:", address.formattedAddress);
      console.log("Pickup coordinates:", [address.lng, address.lat]);
    }
  };

  // Handle delivery address change
  const handleDeliveryAddressChange = (address: AddressType) => {
    setDeliveryAddress(address);

    // Update the form value with the formatted address
    if (address.formattedAddress) {
      form.setValue("deliveryAddress", address.formattedAddress, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      console.log("Delivery place selected:", address.formattedAddress);
      console.log("Delivery coordinates:", [address.lng, address.lat]);
    }
  };

  async function onSubmit(data: ListingFormValues) {
    setIsSubmitting(true);

    try {
      // Convert string values to numbers for price and fee
      const formattedData = {
        ...data,
        itemPrice: parseFloat(data.itemPrice),
        maxFee: parseFloat(data.maxFee),
      };

      // Set the current listing in the matchmaking context
      setCurrentListing(formattedData);

      // Format locations to match the bot format
      const pickupLocation = {
        latitude: pickupAddress.lat,
        longitude: pickupAddress.lng,
      };

      const destinationLocation = {
        latitude: deliveryAddress.lat,
        longitude: deliveryAddress.lng,
      };

      // Make the API call to create the listing
      try {
        const response = await fetch("/api/listings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemDescription: formattedData.itemDescription,
            itemPrice: formattedData.itemPrice,
            maxFee: formattedData.maxFee,
            pickupLocation: {
              ...pickupLocation,
              address: formattedData.pickupAddress, // Keep address for display purposes
            },
            destinationLocation: {
              ...destinationLocation,
              address: formattedData.deliveryAddress, // Keep address for display purposes
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create listing");
        }

        const result = await response.json();
        console.log("Listing created:", result);
      } catch (apiError) {
        console.error("API error:", apiError);
        // Continue with the flow even if the API call fails
      }

      // Call the success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      // Close the dialog
      onClose();
    } catch (error) {
      console.error("Error creating listing:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="itemDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the item you need delivered"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a clear description of what needs to be delivered.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="itemPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Price ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormDescription>The cost of the item itself.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Delivery Fee ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Maximum amount you're willing to pay for delivery.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="pickupAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pickup Address</FormLabel>
              <FormControl>
                <AddressAutoComplete
                  address={pickupAddress}
                  setAddress={handlePickupAddressChange}
                  searchInput={pickupSearchInput}
                  setSearchInput={setPickupSearchInput}
                  dialogTitle="Edit Pickup Address"
                  placeholder="Where the item should be picked up"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deliveryAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Address</FormLabel>
              <FormControl>
                <AddressAutoComplete
                  address={deliveryAddress}
                  setAddress={handleDeliveryAddressChange}
                  searchInput={deliverySearchInput}
                  setSearchInput={setDeliverySearchInput}
                  dialogTitle="Edit Delivery Address"
                  placeholder="Where the item should be delivered"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Listing"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
