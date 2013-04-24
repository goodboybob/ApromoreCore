package org.apromore.dao.model;

import static javax.persistence.GenerationType.IDENTITY;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.Table;
import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

import org.apache.commons.lang.builder.EqualsBuilder;
import org.eclipse.persistence.annotations.Cache;
import org.eclipse.persistence.annotations.CacheCoordinationType;
import org.springframework.beans.factory.annotation.Configurable;

/**
 * ProcessModelVersion generated by hbm2java
 */
@Entity
@Table(name = "process_model_version")
@Configurable("processModelVersion")
@Cache(expiry = 180000, size = 5000, coordinationType = CacheCoordinationType.INVALIDATE_CHANGED_OBJECTS)
public class ProcessModelVersion implements Serializable {

    private Integer id;
    private String originalId;
    private Double versionNumber;
    private String createDate;
    private String lastUpdateDate;
    private Integer changePropagation;
    private Integer lockStatus;
    private Integer numVertices;
    private Integer numEdges;

    private Native nativeDocument;
    private ProcessBranch processBranch;
    private FragmentVersion rootFragmentVersion;

    private Set<FragmentVersion> fragmentVersions = new HashSet<>(0);

    private Set<Annotation> annotations = new HashSet<>(0);
    private Set<EditSession> editSessions = new HashSet<>(0);
    private Set<Node> parentProcesses = new HashSet<>(0);
    private Set<ProcessBranch> currentProcessModelVersion = new HashSet<>(0);
    private Set<ProcessBranch> sourceProcessModelVersion = new HashSet<>(0);
    private Set<ProcessModelAttribute> processModelAttributes = new HashSet<>(0);
    private Set<Object> objects = new HashSet<>(0);
    private Set<Resource> resources = new HashSet<>(0);


    /**
     * Default Constructor.
     */
    public ProcessModelVersion() {
    }


    @Id
    @GeneratedValue(strategy = IDENTITY)
    @Column(name = "id", unique = true, nullable = false)
    public Integer getId() {
        return this.id;
    }

    public void setId(final Integer id) {
        this.id = id;
    }


    @Column(name = "originalId")
    public String getOriginalId() {
        return this.originalId;
    }

    public void setOriginalId(final String newOriginalId) {
        this.originalId = newOriginalId;
    }

    @Column(name = "version_number")
    public Double getVersionNumber() {
        return this.versionNumber;
    }

    public void setVersionNumber(final Double newVersionNumber) {
        this.versionNumber = newVersionNumber;
    }

    @Column(name = "createDate")
    public String getCreateDate() {
        return this.createDate;
    }

    public void setCreateDate(final String newCreationDate) {
        this.createDate = newCreationDate;
    }

    @Column(name = "lastUpdateDate")
    public String getLastUpdateDate() {
        return this.lastUpdateDate;
    }

    public void setLastUpdateDate(final String newLastUpdate) {
        this.lastUpdateDate = newLastUpdate;
    }

    @Column(name = "change_propagation")
    public Integer getChangePropagation() {
        return this.changePropagation;
    }

    public void setChangePropagation(final Integer newChangePropagation) {
        this.changePropagation = newChangePropagation;
    }


    @Column(name = "lock_status")
    public Integer getLockStatus() {
        return this.lockStatus;
    }

    public void setLockStatus(final Integer newLockStatus) {
        this.lockStatus = newLockStatus;
    }


    @Column(name = "num_nodes")
    public Integer getNumVertices() {
        return this.numVertices;
    }

    public void setNumVertices(final Integer newNumVertices) {
        this.numVertices = newNumVertices;
    }


    @Column(name = "num_edges")
    public Integer getNumEdges() {
        return this.numEdges;
    }

    public void setNumEdges(final Integer newNumEdges) {
        this.numEdges = newNumEdges;
    }



    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "nativeId", referencedColumnName = "id")
    public Native getNativeDocument() {
        return this.nativeDocument;
    }

    public void setNativeDocument(final Native newNative) {
        this.nativeDocument = newNative;
    }


    @ManyToOne
    @JoinColumn(name = "branchId")
    public ProcessBranch getProcessBranch() {
        return this.processBranch;
    }

    public void setProcessBranch(final ProcessBranch newProcessBranches) {
        this.processBranch = newProcessBranches;
    }


    @ManyToOne
    @JoinColumn(name = "rootFragmentVersionId")
    public FragmentVersion getRootFragmentVersion() {
        return this.rootFragmentVersion;
    }

    public void setRootFragmentVersion(final FragmentVersion newRootFragmentVersion) {
        this.rootFragmentVersion = newRootFragmentVersion;
    }


    @ManyToMany
    @JoinTable(name = "process_fragment_map",
            joinColumns = { @JoinColumn(name = "processModelVersionId") },
            inverseJoinColumns = { @JoinColumn(name = "fragmentVersionId") }
    )
    public Set<FragmentVersion> getFragmentVersions() {
        return this.fragmentVersions;
    }

    public void setFragmentVersions(Set<FragmentVersion> fragmentVersions) {
        this.fragmentVersions = fragmentVersions;
    }

    public void addFragmentVersion(FragmentVersion fragmentVersion) {
        this.fragmentVersions.add(fragmentVersion);
    }


    @OneToMany(mappedBy = "processModelVersion")
    public Set<Annotation> getAnnotations() {
        return this.annotations;
    }

    public void setAnnotations(final Set<Annotation> newAnnotations) {
        this.annotations = newAnnotations;
    }

    @OneToMany(mappedBy = "processModelVersion")
    public Set<EditSession> getEditSessions() {
        return this.editSessions;
    }

    public void setEditSessions(final Set<EditSession> editSessions) {
        this.editSessions = editSessions;
    }

    @OneToMany(mappedBy = "subProcess")
    public Set<Node> getParentProcesses() {
        return this.parentProcesses;
    }

    public void setParentProcesses(final Set<Node> newParentProcesses) {
        this.parentProcesses = newParentProcesses;
    }

    @OneToMany(mappedBy = "currentProcessModelVersion")
    public Set<ProcessBranch> getCurrentProcessModelVersion() {
        return this.currentProcessModelVersion;
    }

    public void setCurrentProcessModelVersion(final Set<ProcessBranch> newCurrentIds) {
        this.currentProcessModelVersion = newCurrentIds;
    }

    @OneToMany(mappedBy = "sourceProcessModelVersion")
    public Set<ProcessBranch> getSourceProcessModelVersion() {
        return this.sourceProcessModelVersion;
    }

    public void setSourceProcessModelVersion(final Set<ProcessBranch> newSourceIds) {
        this.sourceProcessModelVersion = newSourceIds;
    }


    @OneToMany(mappedBy = "processModelVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    public Set<ProcessModelAttribute> getProcessModelAttributes() {
        return this.processModelAttributes;
    }

    public void setProcessModelAttributes(Set<ProcessModelAttribute> processModelAttributes) {
        this.processModelAttributes = processModelAttributes;
    }

    @OneToMany(mappedBy = "processModelVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    public Set<Object> getObjects() {
        return this.objects;
    }

    public void setObjects(Set<Object> objectTypes) {
        this.objects = objectTypes;
    }

    @OneToMany(mappedBy = "processModelVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    public Set<Resource> getResources() {
        return this.resources;
    }

    public void setResources(Set<Resource> resourceTypes) {
        this.resources = resourceTypes;
    }


    @Override
    public boolean equals(java.lang.Object obj) {
        if (obj == null) { return false; }
        if (obj == this) { return true; }
        if (obj.getClass() != getClass()) {
            return false;
        }
        ProcessModelVersion rhs = (ProcessModelVersion) obj;
        return new EqualsBuilder()
                .appendSuper(super.equals(obj))
                .append(id, rhs.id)
                .append(originalId, rhs.originalId)
                .append(versionNumber, rhs.versionNumber)
                .append(numVertices, rhs.numVertices)
                .append(numEdges, rhs.numEdges)
                .isEquals();
    }
}


