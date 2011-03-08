package org.apromore.canoniser.adapters.test;

import java.io.File;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBElement;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Marshaller;
import javax.xml.bind.Unmarshaller;

import org.apromore.anf.AnnotationsType;
import org.apromore.canoniser.adapters.Canonical2XPDL;
import org.apromore.canoniser.exception.ExceptionAdapters;
import org.apromore.cpf.CanonicalProcessType;
import org.wfmc._2008.xpdl2.PackageType;

public class TestCanonical2XPDL {

	/**
	 * @param args
	 * @throws ExceptionAdapters 
	 */
	public static void main(String[] args) throws ExceptionAdapters {
		File cpf_file = new File("/powderfinger/home/fauvet/models/eeeee.cpf");
		File anf_initial_file = new File("/powderfinger/home/fauvet/models/test/test-blue-initial.anf");
		File anf_green_file = new File("/powderfinger/home/fauvet/models/test/test-blue-green.anf");
		//File cpf_file = new File("/home/fauvet/models/model1.cpf");
		//File anf_file = new File("/home/fauvet/models/model1.anf");
		try {
			JAXBContext jc = JAXBContext.newInstance("org.apromore.cpf");
			Unmarshaller u = jc.createUnmarshaller();
			JAXBElement<CanonicalProcessType> rootElement = (JAXBElement<CanonicalProcessType>) u.unmarshal(cpf_file);
			CanonicalProcessType cpf = rootElement.getValue();

//			jc = JAXBContext.newInstance("org.apromore.anf");
//			u = jc.createUnmarshaller();
//			JAXBElement<AnnotationsType> anfRootElement = (JAXBElement<AnnotationsType>) u.unmarshal(anf_initial_file);
//			AnnotationsType anf = anfRootElement.getValue();
			
//			Canonical2XPDL canonical2xpdl_with_anf = new Canonical2XPDL (cpf, anf);
			Canonical2XPDL canonical2xpdl_no_anf = new Canonical2XPDL(cpf);
			
			jc = JAXBContext.newInstance("org.wfmc._2008.xpdl2");
			Marshaller m1 = jc.createMarshaller();
			m1.setProperty(javax.xml.bind.Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE );
			
			JAXBElement<PackageType> cprocRootElem1 = 
				new org.wfmc._2008.xpdl2.ObjectFactory().createPackage(canonical2xpdl_no_anf.getXpdl());
			m1.marshal(cprocRootElem1, new File("/coldplay/home/fauvet/models/eeeee.xpdl"));
			
//			jc = JAXBContext.newInstance("org.apromore.anf");
//			u = jc.createUnmarshaller();
//			anfRootElement = (JAXBElement<AnnotationsType>) u.unmarshal(anf_green_file);
//			anf = anfRootElement.getValue();
			
//			canonical2xpdl_with_anf = new Canonical2XPDL (cpf, anf);
//			jc = JAXBContext.newInstance("org.wfmc._2008.xpdl2");
//			Marshaller m2 = jc.createMarshaller();
//			m2.setProperty(javax.xml.bind.Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE );
//			
//			JAXBElement<PackageType> cprocRootElem2 = 
//				new org.wfmc._2008.xpdl2.ObjectFactory().createPackage(canonical2xpdl_with_anf.getXpdl());
//			m1.marshal(cprocRootElem2, new File("/coldplay/home/fauvet/models/test/test-blue-green.xpdl"));
			
		} catch (JAXBException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

}
